
import mongoose, { Document } from "mongoose"


export interface IUser extends Document {
  fullname: string
  email: string
  password: string
  profilephoto?: string
  registrationNo?: string
  semester?: string
  phoneNumber?: string
  subject?: string
  branch?: string
  role: 'student' | 'teacher' | 'admin'
  join_date: Date
  verified?: boolean
  refreshToken?: string | null

  macAddress?: string
  macHash?: string

  isPasswordCorrect(password: string): Promise<boolean>
  generateAccessToken(): string
  generateRefreshToken(): string
}