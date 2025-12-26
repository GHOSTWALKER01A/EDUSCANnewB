// src/controllers/student.controller.ts
import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asynchandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import UserModel  from '../models/auth.model.js';
import { uploadOnCloudinary  } from '../services/Cloudinary.js'; // implement uploading to cloud optionally


export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?._id;
  if (!userId) throw new ApiError(401, 'Unauthorized');

  const user = await UserModel.findById(userId).select('-password -refreshToken -__v');
  if (!user) throw new ApiError(404, 'User not found');

  return res.status(200).json(new ApiResponse(200, user, 'Profile fetched'));
});


export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?._id;
  console.log(userId);
  if (!userId) throw new ApiError(401, 'Unauthorized');

  const user = await UserModel.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  // if frontend sent multipart/form-data, req.files may contain 'profilephoto'
  if (req.files && (req.files as any).profilephoto && (req.files as any).profilephoto[0]) {
    // upload file to cloud and set user.profilephoto to hosted URL
    const file = (req.files as any).profilephoto[0];
    const uploaded = await uploadOnCloudinary(file.path); // implement uploadFile -> returns { url }
    if (uploaded) {
      user.profilephoto = uploaded.url;
    }
  } else if (req.body.profilephoto) {
    user.profilephoto = req.body.profilephoto;
  }

  // update fields safely
  user.fullname = req.body.fullname ?? user.fullname;
  // do not allow changing role, registration no via this route
  user.phoneNumber = req.body.phoneNumber ?? user.phoneNumber;
  user.email = req.body.email ?? user.email;

  await user.save();

  const result = await UserModel.findById(userId).select('-password -refreshToken -__v');
  return res.status(200).json(new ApiResponse(200, result, 'Profile updated'));
});
