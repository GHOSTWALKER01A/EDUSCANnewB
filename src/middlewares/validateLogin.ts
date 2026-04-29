// import { NextFunction, Request, Response } from "express";

// import {registerSchema, loginSchema,logoutSchema } from "../schemas/signUp.schema.js"

// import { ZodError } from "zod";



// export const validateRegister = (req:Request,res:Response,next:NextFunction)=>{
//     try {
//      registerSchema.parse(req.body)
//      next()
//     } catch (error: any) {
//       if (error instanceof ZodError) {
//          return res.status(400).json({
//              message:error.issues[0].message
//          })
//       }
//       return res.status(400).json({
//          message:"Validation failed for register "
//       })
//     } 
// } 

// export const validateLogin = (req:Request,res:Response,next:NextFunction)=>{
//    try {
//     loginSchema.parse(req.body)
//     next()
//    } catch (error: any) {
//      if (error instanceof ZodError) {
//         return res.status(400).json({
//             message:error.issues[0].message
//         })
//      }
//      return res.status(400).json({
//         message:"Validation failed for login "
//      })
//    } 
// } 

// export const validateLogout = (req:Request,res:Response,next:NextFunction)=>{
//     try {
//         logoutSchema.parse(req.body)
//         next()
//     } catch (error: any) {
//         if (error instanceof ZodError) {
//             return res.status(400).json({
//                 message:error.issues[0].message
//             })
//          }
//          return res.status(400).json({
//             message:"Validation failed for logout "
//          })
//        } 
// } 


