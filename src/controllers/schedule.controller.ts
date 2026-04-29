import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asynchandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import TimetableModel, { ITimeSlot } from '../models/Timetable.model.js';
import UserModel from '../models/auth.model.js';

// Helper function to format timetable slots into the frontend expected format
const formatTimetableForUser = (timetable: any, filterFn: (subject: any) => boolean) => {
  return timetable.slots.map((slot: any) => {
    return {
      time: slot.time,
      isRecess: slot.isRecess,
      subjects: slot.subjects
        .filter(filterFn)
        .map((s: any) => ({
          _id: s._id,
          day: s.day,
          subject: s.subject,
          type: s.type,
          room: s.room,
          teacher: s.teacher,
          branch: timetable.branch,
          semester: timetable.semester,
          status: s.status || 'scheduled',
          note: s.note,
          rescheduledTo: s.rescheduledTo
        }))
    };
  }).filter((slot: any) => slot.isRecess || slot.subjects.length > 0);
};

// GET: Fetch Teacher Schedule
export const getTeacherSchedule = asyncHandler(async (req: Request, res: Response) => {
  const teacherId = (req as any).user?._id; 
  if (!teacherId) throw new ApiError(401, 'Unauthorized');

  const teacher = await UserModel.findById(teacherId);
  if (!teacher) throw new ApiError(404, 'Teacher not found');

  const timetables = await TimetableModel.find({});
  
  const scheduleMap = new Map();

  timetables.forEach((timetable) => {
    timetable.slots.forEach((slot: ITimeSlot) => {
      const teacherSubjects = slot.subjects.filter(s => 
        s.teacher && s.teacher.toLowerCase() === teacher.fullname.toLowerCase()
      );
       
      if (teacherSubjects.length > 0) {
        if (!scheduleMap.has(slot.time)) {
          scheduleMap.set(slot.time, { time: slot.time, isRecess: slot.isRecess, subjects: [] });
        }
        
        teacherSubjects.forEach(s => {
          scheduleMap.get(slot.time).subjects.push({
            _id: s._id,
            day: s.day,
            subject: s.subject,
            type: s.type,
            room: s.room,
            teacher: s.teacher,
            branch: timetable.branch,
            semester: timetable.semester,
            status: s.status || 'scheduled',
            note: s.note,
            rescheduledTo: s.rescheduledTo,
            timetableId: timetable._id // pass timetableId to help with updates
          });
        });
      }
    });
  });

  const formattedData = Array.from(scheduleMap.values()).sort((a, b) => a.time.localeCompare(b.time));
  return res.status(200).json(new ApiResponse(200, formattedData, 'Teacher schedule fetched successfully'));
});

// GET: Fetch Student Schedule (by branch and semester)
export const getStudentSchedule = asyncHandler(async (req: Request, res: Response) => {
  const branch = (req as any).user?.branch; 
  const semester = (req as any).user?.semester;

  if(!branch || !semester) {
    throw new ApiError(400, 'Student branch or semester not found');
  }

  const timetable = await TimetableModel.findOne({ 
    branch: branch.toUpperCase(), 
    semester: semester 
  });
  
  if (!timetable) {
    return res.status(200).json(new ApiResponse(200, [], 'No schedule found for your branch and semester'));
  }

  const formattedData = formatTimetableForUser(timetable, () => true);
  return res.status(200).json(new ApiResponse(200, formattedData, 'Student schedule fetched successfully'));
});

// GET: Fetch upcoming Schedule for student
export const getUpcomingSchedule = asyncHandler(async (req: Request, res: Response) => {
  const branch = (req as any).user?.branch;
  const semester = (req as any).user?.semester;

  if(!branch || !semester) {
    return res.status(200).json(new ApiResponse(200, [], 'Student has no branch or semester assigned'));
  }

  const daysOfWeek = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const today = daysOfWeek[new Date().getDay()];

  const timetable = await TimetableModel.findOne({ 
    branch: branch.toUpperCase(), 
    semester: semester 
  });
  
  if (!timetable) {
    return res.status(200).json(new ApiResponse(200, [], 'No upcoming schedule found'));
  }

  const formattedData = formatTimetableForUser(timetable, (s) => s.day === today);
  return res.status(200).json(new ApiResponse(200, formattedData, 'Upcoming schedule fetched successfully'));
});

// PATCH: Cancel a scheduled period (Teacher only)
export const cancelPeriod = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params; // this is the subject _id
  const { note } = req.body;
  const teacherId = (req as any).user?._id;

  if (!teacherId) throw new ApiError(401, 'Unauthorized');

  const teacher = await UserModel.findById(teacherId);
  if (!teacher) throw new ApiError(404, 'Teacher not found');

  // Find the timetable that contains this subject _id
  const timetable = await TimetableModel.findOne({ 'slots.subjects._id': id });
  if (!timetable) throw new ApiError(404, 'Timetable containing this period not found');

  let targetSubject: any = null;

  for (const slot of timetable.slots) {
    const subject = slot.subjects.find((s: any) => s._id && s._id.toString() === id);
    if (subject) {
      if (subject.teacher.toLowerCase() !== teacher.fullname.toLowerCase()) {
        throw new ApiError(403, 'You are not authorized to cancel this class');
      }
      subject.status = 'cancelled';
      subject.note = note || 'Instructor unavailable.';
      targetSubject = subject;
      break;
    }
  }

  if (!targetSubject) {
    throw new ApiError(404, 'Period not found in timetable slots');
  }

  await timetable.save();

  return res.status(200).json(new ApiResponse(200, targetSubject, 'Class cancelled successfully'));
});

// POST: Reschedule a period (Teacher only)
export const reschedulePeriod = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params; // subject _id
  const { newDay, newTime, newVenue, note } = req.body;
  const teacherId = (req as any).user?._id;

  if (!teacherId) throw new ApiError(401, 'Unauthorized');

  const teacher = await UserModel.findById(teacherId);
  if (!teacher) throw new ApiError(404, 'Teacher not found');

  if (!['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].includes(newDay)) {
    throw new ApiError(400, 'Invalid day for rescheduling');
  }

  const timetable = await TimetableModel.findOne({ 'slots.subjects._id': id });
  if (!timetable) throw new ApiError(404, 'Timetable containing this period not found');

  let targetSubject: any = null;

  // 1. Mark original as rescheduled
  for (const slot of timetable.slots) {
    const subject = slot.subjects.find((s: any) => s._id && s._id.toString() === id);
    if (subject) {
      if (subject.teacher.toLowerCase() !== teacher.fullname.toLowerCase()) {
        throw new ApiError(403, 'You are not authorized to reschedule this class');
      }
      const rescheduledToText = `${newDay.charAt(0).toUpperCase() + newDay.slice(1)} ${newTime}`;
      subject.status = 'rescheduled';
      subject.rescheduledTo = rescheduledToText;
      subject.note = note || 'Class moved.';
      targetSubject = subject;
      break;
    }
  }

  if (!targetSubject) {
    throw new ApiError(404, 'Original period not found in timetable');
  }

  // 2. Create the new explicitly scheduled period in the matching timeslot
  const targetSlot = timetable.slots.find(s => s.time === newTime);
  if (!targetSlot) {
    throw new ApiError(400, `Target timeslot ${newTime} not found in this timetable`);
  }

  if (targetSlot.isRecess) {
    throw new ApiError(400, 'Cannot reschedule a class during recess');
  }

  // Add the new subject to the target slot
  targetSlot.subjects.push({
    day: newDay,
    subject: targetSubject.subject,
    type: targetSubject.type,
    room: newVenue || targetSubject.room,
    teacher: targetSubject.teacher,
    status: 'scheduled'
  } as any);

  await timetable.save();

  return res.status(200).json(new ApiResponse(200, null, 'Class rescheduled successfully'));
});
