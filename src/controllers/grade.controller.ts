// src/controllers/grade.controller.ts
import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asynchandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import GradeModel from '../models/Grade.types.js';

export const getGradesBySemester = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;

    const sem = parseInt(req.params.semester, 10);
    
    if (isNaN(sem)) throw new ApiError(400, 'Invalid semester');
  
    const grades = await GradeModel.find({ studentId: userId, semester: sem });
    if (!grades || grades.length === 0) return res.status(404).json(new ApiResponse(404, [], 'No grades found'));
  
    return res.status(200).json(
        new ApiResponse(
            200,
             grades,
            'Grades fetched'
            ));
  } catch (error: any) {
    console.log('error fetching grades', error);
    throw new ApiError(500, 'Internal Server Error');
  }
});

export const getGradeSummary = asyncHandler(async (req: Request, res: Response) => {
  // simple mock average grade until fuller logic is built
  return res.status(200).json(
    new ApiResponse(
      200,
      { avg: 'A-' },
      'Grade summary fetched'
    )
  );
});

export const getAllGrades = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const grades = await GradeModel.find({ studentId: userId });
  return res.status(200).json(new ApiResponse(200, grades || [], 'All Grades fetched'));
});
