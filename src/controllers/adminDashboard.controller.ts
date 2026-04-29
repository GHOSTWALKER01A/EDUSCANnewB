import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asynchandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import UserModel from '../models/auth.model.js';
import AttendanceModel from '../models/Attendance.model.js';
import ClassModel from '../models/Class.model.js';
import EventModel from '../models/Event.modal.js';

// ─── Helper: get date range for a day ────────────────────────────────────────
const dayRange = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start, end };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard
// Returns: counts, global attendance rate, weekly trend, and activity feed
// ─────────────────────────────────────────────────────────────────────────────
export const getDashboardOverview = asyncHandler(async (_req: Request, res: Response) => {

  // 1. Run all independent counts in parallel
  const [totalStudents, totalTeachers, todayClasses, ongoingClasses] = await Promise.all([
    UserModel.countDocuments({ role: 'student' }),
    UserModel.countDocuments({ role: 'teacher' }),
    (async () => {
      const { start, end } = dayRange(new Date());
      return ClassModel.countDocuments({ date: { $gte: start, $lt: end } });
    })(),
    (async () => {
      const { start, end } = dayRange(new Date());
      return ClassModel.countDocuments({ date: { $gte: start, $lt: end }, status: 'ongoing' });
    })(),
  ]);

  // 2. Global attendance rate (all time, across all students)
  const globalAgg = await AttendanceModel.aggregate([
    {
      $group: {
        _id: null,
        total:   { $sum: 1 },
        present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
      }
    }
  ]);
  const globalTotal   = globalAgg[0]?.total   ?? 0;
  const globalPresent = globalAgg[0]?.present  ?? 0;
  const attendanceRate = globalTotal > 0 ? Math.round((globalPresent / globalTotal) * 100 * 10) / 10 : 0;

  // 3. Attendance trend for the last 6 days (Mon–Sat style)
  const trends: number[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const { start, end } = dayRange(d);

    const dayAgg = await AttendanceModel.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: null,
          total:   { $sum: 1 },
          present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
        }
      }
    ]);

    const dayTotal   = dayAgg[0]?.total   ?? 0;
    const dayPresent = dayAgg[0]?.present  ?? 0;
    trends.push(dayTotal > 0 ? Math.round((dayPresent / dayTotal) * 100) : 0);
  }

  // 4. Student count last month for trend %
  const lastMonthStart = new Date();
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1, 1);
  lastMonthStart.setHours(0, 0, 0, 0);
  const lastMonthEnd = new Date(lastMonthStart);
  lastMonthEnd.setMonth(lastMonthEnd.getMonth() + 1);
  const studentsLastMonth = await UserModel.countDocuments({ role: 'student', createdAt: { $lt: lastMonthEnd } });
  const studentTrend = studentsLastMonth > 0
    ? Math.round(((totalStudents - studentsLastMonth) / studentsLastMonth) * 100 * 10) / 10
    : 0;

  // Attendance week-over-week trend
  const thisWeekRate  = trends.length > 0 ? trends[trends.length - 1] : 0;
  const lastWeekRate  = trends.length > 1 ? trends[trends.length - 2] : 0;
  const attendanceTrendValue = Math.round((thisWeekRate - lastWeekRate) * 10) / 10;

  // 5. Recent activity feed – pull last 5 from Classes + Events combined
  const [recentClasses, recentEvents] = await Promise.all([
    ClassModel.find().sort({ createdAt: -1 }).limit(3).lean(),
    EventModel.find().sort({ createdAt: -1 }).limit(3).lean(),
  ]);

  // Low attendance students (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const lowAttStudents = await AttendanceModel.aggregate([
    { $match: { createdAt: { $gte: weekAgo } } },
    {
      $group: {
        _id:     '$studentId',
        total:   { $sum: 1 },
        present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
      }
    },
    {
      $project: {
        pct: { $cond: [{ $gt: ['$total', 0] }, { $divide: ['$present', '$total'] }, 0] }
      }
    },
    { $match: { pct: { $lt: 0.75 } } },
    { $count: 'count' }
  ]);
  const lowAttCount = lowAttStudents[0]?.count ?? 0;

  // Build consistent activity feed
  // Typed explicitly so every entry (including the later `unshift`) is accepted
  type ActivityEntry = { id: string; type: 'attendance' | 'schedule' | 'system'; message: string; time: string };
  const activity: ActivityEntry[] = [
    ...recentClasses.map((c: any) => ({
      id:      c._id.toString(),
      type:    'schedule' as const,
      message: `Class "${c.name}" (${c.subject}) scheduled for ${new Date(c.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}.`,
      time:    timeAgo(new Date(c.createdAt)),
    })),
    ...recentEvents.map((e: any) => ({
      id:      e._id.toString(),
      type:    'system' as const,
      message: `Event: "${e.title}" – ${e.description?.slice(0, 60) ?? ''}…`,
      time:    timeAgo(new Date(e.createdAt)),
    })),
  ]
    .sort(() => 0) // already recent-first from DB
    .slice(0, 5);

  if (lowAttCount > 0) {
    activity.unshift({
      id:      'low-att',
      type:    'attendance' as const,
      message: `${lowAttCount} student${lowAttCount > 1 ? 's' : ''} flagged for attendance below 75% this week.`,
      time:    'This week',
    });
  }

  return res.status(200).json(new ApiResponse(200, {
    totalStudents,
    totalTeachers,
    classesToday:         todayClasses,
    ongoingClasses,
    attendanceRate,
    studentTrend,
    attendanceTrendValue,
    attendanceTrends:     trends,
    lowAttendanceCount:   lowAttCount,
    recentActivity:       activity.slice(0, 5),
  }, 'Dashboard overview fetched successfully'));
});

// ─── Utility: human-readable "time ago" ──────────────────────────────────────
function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60)   return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? 's' : ''} ago`;
}
