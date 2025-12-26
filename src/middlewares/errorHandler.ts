import { ApiError } from '../utils/ApiError.js'
import { Request, Response, NextFunction } from 'express'

export const errorHandler = (err:any, req:Request, res:Response, next:NextFunction) => {
  const statusCode =
    err instanceof ApiError
      ? err.statusCode
      : 500

  const message =
    err instanceof ApiError
      ? err.message
      : 'Internal Server Error'

  res.status(statusCode).json({
    success: false,
    message,
  })
}
