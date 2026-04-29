import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { ApiError } from '../utils/ApiError.js';

export const restrictTo = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }
    next();
  };
};
