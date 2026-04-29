import { EventSchema } from "../schemas/event.schema.js";
import {ZodError} from "zod"
import { Request, Response, NextFunction } from "express";


export const validateEvent = (req:Request,res:Response,next:NextFunction)=>{
    try {
        EventSchema.parse(req.body)
        next()
    } catch (error: any) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                message:error.issues[0].message
            })
         }
         return res.status(400).json({
            message:" Validation failed for event "
         })
       } 
} 
