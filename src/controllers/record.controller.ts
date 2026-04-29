import { Request,Response } from "express";
import { ApiResponse } from "../utils/ApiResponse.js";
import UserModel from "../models/auth.model.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";





export const listStudents = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    perPage = 20,
    q,
    semester,
    branch,
    sortKey = 'createdAt',
    sortDir = 'desc',
  } = req.query;

  const pageNum = Number(page);
  const limit = Number(perPage);

  const filter: any = { role: 'student' };

  if (semester) filter.semester = Number(semester);
  if (branch) filter.branch = String(branch).toUpperCase();

  if (q) {
    filter.$or = [
      { regNo: { $regex: q, $options: 'i' } },
      { fullname: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
    ];
  }

  const sort: any = {
    [String(sortKey)]: sortDir === 'asc' ? 1 : -1,
  };

  const [students, total] = await Promise.all([
    UserModel.find(filter)
      .sort(sort)
      .skip((pageNum - 1) * limit)
      .limit(limit)
      .lean(),
    UserModel.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      students,
      page: pageNum,
      perPage: limit,
      total,
    },
 "Student Record Fetch successfully"
)
  );
});

export const toggleBlockStudent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { blocked } = req.body;

  if (typeof blocked !== 'boolean') {
    throw new ApiError(400, 'blocked must be boolean');
  }

  const student = await UserModel.findById(id);
  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  student.blocked = blocked;
  await student.save();

  return res.status(200).json(
    new ApiResponse(200,
         student,
     blocked ? 'Student blocked' : 'Student unblocked')
  );
})

export const getStudentById = asyncHandler(async (req: Request, res: Response) => {
  const student = await UserModel.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found');

  return res.status(200).json(
    new ApiResponse(200,
         student
        )
    );
});