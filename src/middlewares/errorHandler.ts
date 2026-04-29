import { ApiError } from '../utils/ApiError.js'
import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export const errorHandler = (err:any, req:Request, res:Response, next:NextFunction) => {
  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const errorMessages = err.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: errorMessages,
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: Object.values(err.errors || {}).map((e: any) => e.message).join(', ') || err.message,
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    return res.status(400).json({
      success: false,
      message: `Duplicate value entered for field: ${field}`
    });
  }

  const statusCode =
    err instanceof ApiError
      ? err.statusCode
      : 500

  const message =
    err instanceof ApiError
      ? err.message
      : (err.message || 'Internal Server Error')

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}
