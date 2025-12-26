
import { z } from "zod";



export const sendOtpSchema = z.object({
  email: z.string().email().refine((s) => s.endsWith('@bitsindri.ac.in')),
})

export const verifyOtpSchema = z.object({
  email: z.string().email().refine((s) => s.endsWith('@bitsindri.ac.in')),
  code: z.string().length(6),
})

export const resetPasswordSchema = z.object({
  email: z.string().email().refine((s) => s.endsWith('@bitsindri.ac.in')),
  newPassword: z.string().min(8),
})
