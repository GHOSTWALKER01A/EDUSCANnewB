import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asynchandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import UserModel from '../models/auth.model.js';
import AttendanceModel from '../models/Attendance.model.js';


/** Map internal method enum → frontend-friendly label */
const mapMethod = (method: string): 'QR' | 'Online (WiFi)' | 'Manual' => {
  if (method === 'Golden_Key_QR' || method === 'qr') return 'QR';
  if (method === 'Automated_WiFi' || method === 'auto') return 'Online (WiFi)';
  return 'Manual';
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/attendance
// Query params: ?search=&semester=&branch=&method=&page=1&limit=20
// Returns paginated per-student attendance stats
// ─────────────────────────────────────────────────────────────────────────────
export const getAdminAttendanceOverview = asyncHandler(async (req: Request, res: Response) => {
  const { search, semester, branch, method, page = '1', limit = '50' } = req.query as Record<string, string>;
  const pageNum  = Math.max(1, parseInt(page, 10));
  const pageSize = Math.max(1, Math.min(200, parseInt(limit, 10)));

  // 1. Build student filter
  const studentFilter: any = { role: 'student' };
  if (search) {
    studentFilter.$or = [
      { fullname:       { $regex: search, $options: 'i' } },
      { registrationNo: { $regex: search, $options: 'i' } },
    ];
  }
  if (semester) studentFilter.semester = semester;
  if (branch)   studentFilter.branch   = branch.toUpperCase();

  const totalStudents = await UserModel.countDocuments(studentFilter);
  const students = await UserModel.find(studentFilter)
    .sort({ fullname: 1 })
    .skip((pageNum - 1) * pageSize)
    .limit(pageSize)
    .lean();

  if (students.length === 0) {
    return res.status(200).json(new ApiResponse(200, {
      records: [],
      stats: { totalTracked: 0, avgAttendance: 0, lowAttendanceCount: 0 },
      pagination: { page: pageNum, limit: pageSize, total: 0 }
    }, 'No students found'));
  }

  const studentIds = students.map(s => s._id);

  // 2. Aggregate attendance counts in one query (present+late = attended)
  const attendanceAgg = await AttendanceModel.aggregate([
    { $match: { studentId: { $in: studentIds } } },
    {
      $group: {
        _id: '$studentId',
        total:   { $sum: 1 },
        present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
        // Determine the most frequently used method
        qrCount:    { $sum: { $cond: [{ $in: ['$method', ['qr', 'Golden_Key_QR']] }, 1, 0] } },
        wifiCount:  { $sum: { $cond: [{ $in: ['$method', ['auto', 'Automated_WiFi']] }, 1, 0] } },
        manualCount:{ $sum: { $cond: [{ $eq:  ['$method', 'manual'] }, 1, 0] } },
      }
    }
  ]);

  // Build a lookup map by studentId
  const attMap = new Map<string, any>();
  for (const agg of attendanceAgg) {
    attMap.set(agg._id.toString(), agg);
  }

  // 3. Compose the final records array
  const records = students.map(s => {
    const agg = attMap.get((s._id as any).toString());
    let attendancePercentage = s.attendancePercentage ?? 0;

    if (agg && agg.total > 0) {
      attendancePercentage = Math.round((agg.present / agg.total) * 100);
    }

    // Dominant method
    let primaryMethod: 'QR' | 'Online (WiFi)' | 'Manual' = 'Manual';
    if (agg) {
      if (agg.qrCount >= agg.wifiCount && agg.qrCount >= agg.manualCount) primaryMethod = 'QR';
      else if (agg.wifiCount >= agg.manualCount) primaryMethod = 'Online (WiFi)';
    }

    return {
      id:                   (s._id as any).toString(),
      registrationNo:       s.registrationNo ?? '',
      fullname:             s.fullname,
      semester:             Number(s.semester) || 1,
      branch:               s.branch ?? '',
      attendancePercentage,
      cgpa:                 0, // CGPA is not in UserModel; placeholder — extend if Grade model is linked
      mostlyAttendanceType: primaryMethod,
    };
  });

  // Filter by method if requested (post-aggregation filter)
  const filteredRecords = method
    ? records.filter(r => r.mostlyAttendanceType === method)
    : records;

  // 4. Summary stats across ALL students (not just current page)
  const allAgg = await AttendanceModel.aggregate([
    { $match: { studentId: { $in: await UserModel.find({ role: 'student' }).distinct('_id') } } },
    {
      $group: {
        _id: '$studentId',
        total:   { $sum: 1 },
        present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
      }
    },
    {
      $project: {
        percentage: {
          $cond: [
            { $gt: ['$total', 0] },
            { $multiply: [{ $divide: ['$present', '$total'] }, 100] },
            0
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        avgAttendance:    { $avg: '$percentage' },
        lowAttendanceCount: { $sum: { $cond: [{ $lt: ['$percentage', 75] }, 1, 0] } },
      }
    }
  ]);

  const statsRaw = allAgg[0] ?? { avgAttendance: 0, lowAttendanceCount: 0 };
  const totalTracked = await UserModel.countDocuments({ role: 'student' });

  return res.status(200).json(new ApiResponse(200, {
    records: filteredRecords,
    stats: {
      totalTracked,
      avgAttendance:      Math.round(statsRaw.avgAttendance ?? 0),
      lowAttendanceCount: statsRaw.lowAttendanceCount ?? 0,
    },
    pagination: { page: pageNum, limit: pageSize, total: totalStudents }
  }, 'Admin attendance overview fetched successfully'));
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/attendance/:studentId/alert
// Sends a warning notification to a student with low attendance
// ─────────────────────────────────────────────────────────────────────────────
export const sendAttendanceAlert = asyncHandler(async (req: Request, res: Response) => {
  const { studentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw new ApiError(400, 'Invalid student ID');
  }

  const student = await UserModel.findOne({ _id: studentId, role: 'student' }).lean();
  if (!student) throw new ApiError(404, 'Student not found');

  // In a real system this would trigger a push notification / email service.
  // Here we return a success envelope so the UI can show the toast correctly.
  return res.status(200).json(new ApiResponse(200, {
    studentId,
    fullname: student.fullname,
    email:    student.email,
  }, `Warning alert dispatched to ${student.fullname}`));
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/attendance/export
// Returns a full CSV-compatible JSON payload for all students filtered by optional params
// ─────────────────────────────────────────────────────────────────────────────
export const exportAttendance = asyncHandler(async (req: Request, res: Response) => {
  const { semester, branch } = req.query as Record<string, string>;

  const studentFilter: any = { role: 'student' };
  if (semester) studentFilter.semester = semester;
  if (branch)   studentFilter.branch   = branch.toUpperCase();

  const students = await UserModel.find(studentFilter).sort({ branch: 1, semester: 1, fullname: 1 }).lean();
  if (!students.length) {
    return res.status(200).json(new ApiResponse(200, [], 'No students to export'));
  }

  const studentIds = students.map(s => s._id);

  const attAgg = await AttendanceModel.aggregate([
    { $match: { studentId: { $in: studentIds } } },
    {
      $group: {
        _id:     '$studentId',
        total:   { $sum: 1 },
        present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
      }
    }
  ]);

  const attMap = new Map<string, { total: number; present: number }>();
  for (const a of attAgg) attMap.set(a._id.toString(), a);

  const rows = students.map(s => {
    const agg = attMap.get((s._id as any).toString());
    const pct = agg && agg.total > 0 ? Math.round((agg.present / agg.total) * 100) : (s.attendancePercentage ?? 0);
    return {
      registrationNo: s.registrationNo ?? '',
      fullname:       s.fullname,
      semester:       s.semester ?? '',
      branch:         s.branch ?? '',
      email:          s.email,
      attendancePercentage: pct,
      totalClasses:   agg?.total ?? 0,
      classesPresent: agg?.present ?? 0,
    };
  });

  return res.status(200).json(new ApiResponse(200, rows, 'Export data ready'));
});
