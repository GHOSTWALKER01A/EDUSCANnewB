// src/middlewares/auth.ts
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import  UserModel  from '../models/auth.model.js'
import { ApiError } from '../utils/ApiError.js'

export interface AuthRequest extends Request {
  user?: any
}

export const verifyJWT = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.accessToken || (req.header('Authorization')?.replace('Bearer ', '') || null)
    if (!token) throw new ApiError(401, 'Unauthorized')

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as any
    const user = await UserModel.findById(decoded._id).select('-password -refreshToken')
    if (!user) throw new ApiError(401, 'Invalid token')
    req.user = user
    next()
  } catch (err: any) {
    next(new ApiError(401, err?.message || 'Invalid token'))
  }
}
