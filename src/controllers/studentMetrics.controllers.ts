import { Request, Response } from "express";
import { computeStudentMetrics } from "../services/metrics.service.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";


export const getStudentMetrics = asyncHandler(async(req: Request , res: Response)=>{
    const user = (req as any).user

    if (!user) {
        throw new ApiError(401 , 'User not found and unauthorized')
    }

    const metrics = await computeStudentMetrics(user._id)

    res.status(200).json(
        new ApiResponse(
            200,
            metrics,
            'Student metrics fetched successfully'
        )
    )
})


