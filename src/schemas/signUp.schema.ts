import { z } from "zod";


export const registerSchema = z.object({
  fullname: z.string().min(2),
  email: z.string().email().refine((s) => s.endsWith('@bitsindri.ac.in'), { message: 'Email must be @bitsindri.ac.in' }),
  password: z.string().min(6),
  registrationNo: z.string().optional(),
  semester: z.string().optional(),
  branch: z.string().optional(),
  phoneNumber: z.string().optional(),
  subject: z.string().optional(),
  role: z.enum(['student', 'teacher', 'admin']),
})


export const loginSchema = z.object({
  emailOrRegistrationNo: z.string().min(1),
  password: z.string().min(6),
})


export const logoutSchema = z.object({
    token:z.string().min(1,{message:"Token is required"})
})

