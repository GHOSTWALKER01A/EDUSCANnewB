import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asynchandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import TimetableModel from '../models/Timetable.model.js';

const DEFAULT_TIME_SLOTS = [
  '09:00 - 09:45',
  '09:45 - 10:30',
  '10:30 - 11:15',
  '11:15 - 11:45',
  '11:45 - 12:30',
  '12:30 - 01:15',
];


export const getAllTimetables = asyncHandler(async (req: Request, res: Response) => {
  const { branch } = req.query;
  const filter = branch ? { branch: (branch as string).toUpperCase() } : {};
  const timetables = await TimetableModel.find(filter).sort({ branch: 1, semester: 1 });
  return res.status(200).json(new ApiResponse(200, timetables, 'Timetables fetched successfully'));
});


export const getTimetableById = asyncHandler(async (req: Request, res: Response) => {
  const timetable = await TimetableModel.findById(req.params.id);
  if (!timetable) throw new ApiError(404, 'Timetable not found');
  return res.status(200).json(new ApiResponse(200, timetable, 'Timetable fetched successfully'));
});


export const createTimetable = asyncHandler(async (req: Request, res: Response) => {
  const { branch, semester } = req.body;

  if (!branch || !semester) {
    throw new ApiError(400, 'Branch and semester are required');
  }

  const exists = await TimetableModel.findOne({
    branch: branch.toUpperCase(),
    semester,
  });

  if (exists) {
    throw new ApiError(409, `A timetable for ${branch.toUpperCase()} - ${semester} Semester already exists`);
  }

  const slots = DEFAULT_TIME_SLOTS.map((time) => ({
    time,
    isRecess: time === '11:15 - 11:45',
    subjects: [],
  }));

  const timetable = await TimetableModel.create({
    branch: branch.toUpperCase(),
    semester,
    slots,
  });

  return res.status(201).json(new ApiResponse(201, timetable, 'Timetable created successfully'));
});

// ─────────────────────────────────────────────
// DELETE /api/admin/timetables/:id
// ─────────────────────────────────────────────
export const deleteTimetable = asyncHandler(async (req: Request, res: Response) => {
  const timetable = await TimetableModel.findByIdAndDelete(req.params.id);
  if (!timetable) throw new ApiError(404, 'Timetable not found');
  return res.status(200).json(new ApiResponse(200, null, 'Timetable deleted successfully'));
});


export const upsertPeriod = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { time, day, subject, type, room, teacher, periodId } = req.body;

  if (!time || !day || !subject || !room || !teacher) {
    throw new ApiError(400, 'time, day, subject, room and teacher are all required');
  }

  const timetable = await TimetableModel.findById(id);
  if (!timetable) throw new ApiError(404, 'Timetable not found');

  const slot = timetable.slots.find((s) => s.time === time);
  if (!slot) throw new ApiError(404, `Time slot "${time}" not found in this timetable`);

  if (slot.isRecess) {
    throw new ApiError(400, 'Cannot assign a period to the recess block');
  }

  // If an existing subject for that day exists — update it; otherwise push a new one
  const existingIdx = slot.subjects.findIndex((s) => s.day === day);

  const periodData = { day, subject, type: type || 'academic', room, teacher };

  if (existingIdx >= 0) {
    // Plain spread — copies existing sub-document fields, then overwrites with new periodData
    slot.subjects[existingIdx] = { ...slot.subjects[existingIdx], ...periodData } as any;
  } else {
    slot.subjects.push(periodData as any);
  }

  await timetable.save();

  return res.status(200).json(new ApiResponse(200, timetable, 'Period saved successfully'));
});


export const deletePeriod = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { time, day } = req.query as { time: string; day: string };

  if (!time || !day) {
    throw new ApiError(400, 'time and day query params are required');
  }

  const timetable = await TimetableModel.findById(id);
  if (!timetable) throw new ApiError(404, 'Timetable not found');

  const slot = timetable.slots.find((s) => s.time === time);
  if (!slot) throw new ApiError(404, `Time slot "${time}" not found`);

  const before = slot.subjects.length;
  slot.subjects = slot.subjects.filter((s) => s.day !== day) as any;

  if (slot.subjects.length === before) {
    throw new ApiError(404, `No period found for day "${day}" in time slot "${time}"`);
  }

  await timetable.save();
  return res.status(200).json(new ApiResponse(200, timetable, 'Period deleted successfully'));
});
