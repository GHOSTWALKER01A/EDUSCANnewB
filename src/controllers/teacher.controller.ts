// src/controllers/teacher.controller.ts
import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asynchandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import UserModel  from '../models/auth.model.js';
import ClassModel from '../models/Class.model.js';
import { uploadOnCloudinary  } from '../services/Cloudinary.service.js';

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?._id;
  if (!userId) throw new ApiError(401, 'Unauthorized');

  const user = await UserModel.findById(userId).select('-password -refreshToken -__v');
  if (!user) throw new ApiError(404, 'User not found');

  return res.status(200).json(new ApiResponse(200, user, 'Profile fetched'));
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?._id;
  if (!userId) throw new ApiError(401, 'Unauthorized');

  const user = await UserModel.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  // if frontend sent multipart/form-data, req.files may contain 'profilephoto'
  if (req.files && (req.files as any).profilephoto && (req.files as any).profilephoto[0]) {
    const file = (req.files as any).profilephoto[0];
    const uploaded = await uploadOnCloudinary(file.path);
    if (uploaded) {
      user.profilephoto = uploaded.url;
    }
  } else if (req.body.profilephoto) {
    user.profilephoto = req.body.profilephoto;
  }

  // update fields safely
  user.fullname = req.body.fullname ?? user.fullname;
  user.phoneNumber = req.body.phoneNumber ?? user.phoneNumber;
  user.email = req.body.email ?? user.email;
  user.subject = req.body.subject ?? user.subject;

  await user.save();

  const result = await UserModel.findById(userId).select('-password -refreshToken -__v');
  return res.status(200).json(new ApiResponse(200, result, 'Profile updated'));
});

export const getTeacherAttendanceStats = asyncHandler(async (req: Request, res: Response) => {
  const teacherId = (req as any).user?._id;
  if (!teacherId) throw new ApiError(401, 'Unauthorized');

  // Find all classes assigned to this teacher that are not cancelled
  const classes = await ClassModel.find({ teacherId, classStatus: { $ne: 'cancelled' } });

  let totalClasses = 0;
  let classesAttended = 0;

  const monthlyStats: Record<string, { total: number, attended: number }> = {};
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const now = Date.now();

  classes.forEach(c => {
    // Only count classes that have already occurred or are scheduled for today
    const classTime = new Date(c.date).getTime();
    if (classTime <= now + 86400000) { // Adding 24 hours to include today
      const monthStr = months[new Date(c.date).getMonth()];
      
      if (!monthlyStats[monthStr]) {
        monthlyStats[monthStr] = { total: 0, attended: 0 };
      }
      
      monthlyStats[monthStr].total++;
      totalClasses++;
      
      if (c.status === 'completed') {
        monthlyStats[monthStr].attended++;
        classesAttended++;
      }
    }
  });

  const rate = totalClasses === 0 ? 0 : Math.round((classesAttended / totalClasses) * 100);

  const monthWise = Object.keys(monthlyStats).map(month => ({
    month,
    total: monthlyStats[month].total,
    attended: monthlyStats[month].attended,
    rate: monthlyStats[month].total === 0 ? 0 : Math.round((monthlyStats[month].attended / monthlyStats[month].total) * 100)
  }));

  return res.json(new ApiResponse(200, {
    totalClasses,
    classesAttended,
    rate,
    monthWise
  }, 'Stats fetched'));
});
