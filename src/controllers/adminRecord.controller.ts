import { Request, Response } from 'express';
import UserModel from '../models/auth.model.js';
import { asyncHandler } from '../utils/asynchandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const getStudents = asyncHandler(async (req: Request, res: Response) => {
  const { search, branch, semester } = req.query;
  let query: any = { role: 'student' };

  if (search) {
    query.$or = [
      { fullname: { $regex: search as string, $options: 'i' } },
      { registrationNo: { $regex: search as string, $options: 'i' } }
    ];
  }
  if (branch) query.branch = branch;
  if (semester) query.semester = semester; // It's string in UserModel

  const students = await UserModel.find(query).sort({ fullname: 1 });
  
  // Map _id to id to match frontend interface exactly
  const formattedStudents = students.map(s => ({
    id: s._id,
    registrationNo: s.registrationNo || '',
    fullname: s.fullname,
    semester: Number(s.semester) || 1, // Frontend expects number
    branch: s.branch || '',
    attendancePercentage: s.attendancePercentage || 0,
    blocked: s.blocked || false,
    email: s.email,
    phone: s.phoneNumber || ''
  }));

  return res.status(200).json({ success: true, count: formattedStudents.length, data: formattedStudents });
});


export const toggleStudentBlock = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { blocked } = req.body;

  if (typeof blocked !== 'boolean') {
    throw new ApiError(400, 'Invalid block status provided.');
  }

  const student = await UserModel.findOneAndUpdate(
    { _id: id, role: 'student' },
    { $set: { blocked } },
    { new: true, runValidators: true }
  );

  if (!student) {
    throw new ApiError(404, 'Student not found.');
  }

  return res.status(200).json(new ApiResponse(200, student, `Student ${blocked ? 'blocked' : 'unblocked'} successfully.`));
});

// ================= TEACHERS =================

export const getTeachers = asyncHandler(async (req: Request, res: Response) => {
  const { search, department, status } = req.query;
  let query: any = { role: 'teacher' };

  if (search) {
    query.$or = [
      { fullname: { $regex: search as string, $options: 'i' } },
      { registrationNo: { $regex: search as string, $options: 'i' } } // employeeId stored as registrationNo in auth flow
    ];
  }
  if (department) query.branch = department; // department mapped to branch in UserModel
  if (status) query.status = status;

  const teachers = await UserModel.find(query).sort({ fullname: 1 });

  const formattedTeachers = teachers.map(t => ({
    id: t._id,
    employeeId: t.registrationNo || '', // Frontend expects employeeId
    fullname: t.fullname,
    department: t.branch || '',
    role: t.role,
    status: t.status || 'Active',
    email: t.email,
    phone: t.phoneNumber || '',
    subjectsCount: t.subject ? 1 : 0 // Basic stub, actual count might require aggregation if teacher has multiple subjects
  }));

  return res.status(200).json({ success: true, count: formattedTeachers.length, data: formattedTeachers });
});


export const updateTeacherStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['Active', 'On Leave', 'Suspended'];

  if (!validStatuses.includes(status)) {
    throw new ApiError(400, 'Invalid status provided.');
  }

  const teacher = await UserModel.findOneAndUpdate(
    { _id: id, role: 'teacher' },
    { $set: { status } },
    { new: true, runValidators: true }
  );

  if (!teacher) {
    throw new ApiError(404, 'Teacher not found.');
  }

  return res.status(200).json(new ApiResponse(200, teacher, `Teacher status updated to ${status}.`));
});
