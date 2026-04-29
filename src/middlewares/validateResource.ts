
import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { createResourceSchema } from "../schemas/Resource.schemas.js";



export const validateResource = (req:Request,res:Response,next:NextFunction)=>{
    try {
        createResourceSchema.parse(req.body)
        next()
    } catch (error: any) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                message:error.issues[0].message
            })
         }
         return res.status(400).json({
            message:" Validation failed for resource "
         })
       } 
} 
