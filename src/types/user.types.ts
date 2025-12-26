import { IUser } from "./auth.types.js";

export interface LoginRequest {
    username: string;
    email: string;
    password: string;
}

export interface LoginResponse {
   token: string;
   role: 'student' | 'teacher' | 'admin'
   user: Partial<IUser>
   isVerified: boolean
}

export interface SendVerificationRequest {
  email: string
}