
import { NextFunction, Request, Response } from "express";
import {verifyOtpSchema,sendOtpSchema,resetPasswordSchema} from "../schemas/verifyCode.schema.js"
import { ZodError } from "zod";



export const validateSendOtp = (req:Request,res:Response,next:NextFunction)=>{
    try {
        sendOtpSchema.parse(req.body)
        next()
    } catch (error: any) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                message:error.issues[0].message
            })
         }
         return res.status(400).json({
            message:" Validation failed for verify code "
         })
       } 
} 


export const validateVerifyOtp = (req:Request,res:Response,next:NextFunction)=>{
    try {
        verifyOtpSchema.parse(req.body)
        next()
    } catch (error: any) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                message:error.issues[0].message
            })
         }
         return res.status(400).json({
            message:" Validation failed for verify code "
         })
       } 
} 


export const validateResetPassword = (req:Request,res:Response,next:NextFunction)=>{
    try {
        resetPasswordSchema.parse(req.body)
        next()
    } catch (error: any) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                message:error.issues[0].message
            })
         }
         return res.status(400).json({
            message:" Validation failed for verify code "
         })
       } 
} 
