// src/controllers/auth.controller.ts
import { Request, Response } from 'express'
import { asyncHandler } from '../utils/asynchandler.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import UserModel  from '../models/auth.model.js'
import { setOTP, getOTP, delOTP } from '../services/Redis.js'
import { sendVerificationEmail } from '../services/Resendemail.js'
import { uploadOnCloudinary } from '../services/Cloudinary.service.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'


// UTIL: generate numeric 6-digit code
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// REGISTER
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
       
     const { fullname, email, password, registrationNo, semester, branch, phoneNumber, subject, role } = req.body
   
     // role-specific minimal checks
     if (!fullname || !email || !password || !role) throw new ApiError(400, 'Missing required fields')

     if (role === 'student' && (!registrationNo || !semester || !branch)) throw new ApiError(400, 'Student fields required')
    
    if (role === 'teacher' && (!subject || !registrationNo)) throw new ApiError(400, 'Teacher fields required')
   
     const exists = await UserModel.findOne({
        $or: [
           { email },
           { registrationNo },
           { phoneNumber }
           ]
       })
     if (exists) throw new ApiError(400, 'User already exists')
   
     const profilePhotoPath = (req.files as { [fieldname: string]: Express.Multer.File[] })?.['profilephoto']?.[0]?.path;
   
     let profilephotoUrl = '';
     if (profilePhotoPath) {
       profilephotoUrl = (await uploadOnCloudinary(profilePhotoPath))?.url || '';

       if (!profilephotoUrl) {
         // log but do not fail the entire request
         console.warn('Cloudinary upload failed, continuing without profile photo.');
         profilephotoUrl = '';
       }
     }
   
   
     const user = await UserModel.create({
       fullname,
       email,
       password,
       registrationNo: registrationNo ?? '',
       semester: semester ?? '',
       branch: branch ?? '',
       phoneNumber: phoneNumber ?? '',
       subject: subject ?? '',
       profilephoto: profilephotoUrl,
       role,
       verified: false,
     })
   
     const created = await UserModel.findById(user._id)
     .select('-password ')

     console.log('BODY:', req.body)
     console.log('FILES:', req.files)

     return res.status(201).json(
       new ApiResponse(
           201,
           {
             user: created,
             
           },
            'User registered. Please verify your email.'
           )
       )
    
})

// LOGIN
export const loginUser = asyncHandler(async (req:Request ,res:Response) => {

    const { emailOrRegistrationNo, password } = req.body
  
    if (!emailOrRegistrationNo || !password) throw new ApiError(400, 'Missing credentials')
  
    const user = await UserModel.findOne({ 
      $or: [
          { email: emailOrRegistrationNo },
          { registrationNo: emailOrRegistrationNo }
         ] 
      })
    if (!user) throw new ApiError(400, 'User not found')
  
    const ok = await user.isPasswordCorrect(password)
  
    if (!ok) throw new ApiError(400, 'Incorrect password')
  
    if (!user.verified) throw new ApiError(403, 'Email not verified')
  
    const accessToken = user.generateAccessToken()
  
    const refreshToken = user.generateRefreshToken()
  
    user.refreshToken = refreshToken
  
    await user.save({ validateBeforeSave: false })
  
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 3600 * 1000,
    }
  
    return res.status(200)
      .cookie('accessToken', accessToken, cookieOptions)
      .cookie('refreshToken', refreshToken, cookieOptions)
      .json(
          new ApiResponse(
              200,
              { user: user.toObject({
                   versionKey: false,
                    transform: (doc, ret: any) => {
                       delete ret.password;
                        delete ret.refreshToken; 
                        return ret 
                      } 
                  }), 
                  accessToken 
              },
              'Login successful'
              )
          )
       
    })

// SEND OTP (public)
export const sendOTP = asyncHandler(async (req: Request, res: Response) => {
 
    const { email } = req.body
    if (!email || !email.endsWith('@bitsindri.ac.in')) throw new ApiError(400, 'Valid email required')

    // create OTP and hashed value
    const otp = generateOTP()
    const hashed = await bcrypt.hash(otp, 10)
    await setOTP(email, hashed, 5 * 60) // 5 minutes

    // send email via Resend
    await sendVerificationEmail(email, otp)

    return res.status(200).json(
        new ApiResponse(
            200,
             { message: 'OTP sent' },
              'OTP sent'
            ))

})

// VERIFY OTP (public)
export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  
    const { email, code } = req.body
  
    if (!email || !code) throw new ApiError(400, 'Email and code required')
  
    const stored = await getOTP(email)
    if (!stored) throw new ApiError(400, 'OTP expired or not found')
  
    const isValid = await bcrypt.compare(code, stored)
    // if (!isValid) throw new ApiError(400, 'Invalid code or expired')
  
    await delOTP(email)
  
    const user = await UserModel.findOneAndUpdate(
        { email },
        { verified: true },
        { new: true }
      )
  
    if (!user) throw new ApiError(404, 'User not found')
  
    const accessToken = user.generateAccessToken()
  
    const refreshToken = user.generateRefreshToken()
  
    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })
  
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
      
    }
  
    
  
    return res
      .status(200)
      .cookie('accessToken', accessToken, cookieOptions)
      .cookie('refreshToken', refreshToken, cookieOptions)
      .json(
          new ApiResponse(
              200, 
              { user: user.toObject({
                   versionKey: false,
                    transform: (_, ret: any) => {
                       delete ret.password;
                        delete ret.refreshToken;
                         return ret
                       } 
                      }),
                       accessToken 
                      },
                        'OTP verified Successfully'
                      ))
})

// RESET PASSWORD (public, but only allow if OTP was verified OR we can accept if user provides email+otp token; for simplicity we require the OTP verification step earlier)
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {

  try {
    const { email, newPassword } = req.body
  
    if (!email || !newPassword) throw new ApiError(400, 'Email and password required')
  
    if (newPassword.length < 6) throw new ApiError(400, 'Password must be >= 6 chars')
  
    const user = await UserModel.findOne({ email })
  
    if (!user) throw new ApiError(404, 'User not found')
  
    user.password = newPassword
    await user.save()
  
    return res.status(200).json(
      new ApiResponse(
          200,
           { email: user.email },
            'Password reset'
          )
      )
  } catch (error:any) {
    console.log("Reset Password error:",error)
    throw new ApiError(500, 'Failed to reset password')
  }
})

// LOGOUT
export const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  try {
    const user = (req as any).user

    if (user) {
      await UserModel.findByIdAndUpdate(user._id, { refreshToken: '' })
    }
    res.clearCookie('accessToken').clearCookie('refreshToken')

    return res.status(200).json(
        new ApiResponse(
            200, 
            {}, 
            'Logged out'
        )
    )
  } catch (err:any) {
    console.log("Logout error:",err)
    throw new ApiError(500, 'Logout failed')
  }
})

// REFRESH TOKEN

export const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
  const incoming = req.cookies?.refreshToken || req.body.refreshToken
  if (!incoming) throw new ApiError(401, 'No refresh token')
  try {
    const decoded: any = jwt.verify(incoming, process.env.REFRESH_TOKEN_SECRET as string)
    const user = await UserModel.findById(decoded._id)

    if (!user || !user.refreshToken || user.refreshToken !== incoming) throw new ApiError(401, 'Invalid refresh token')

    const newAccess = user.generateAccessToken()
    const newRefresh = user.generateRefreshToken()
    user.refreshToken = newRefresh
    await user.save({ validateBeforeSave: false })

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 3600 * 1000,
    }

    return res
      .status(200)
      .cookie('accessToken', newAccess, cookieOptions)
      .cookie('refreshToken', newRefresh, cookieOptions)
      .json(
        new ApiResponse(
            200,
             { accessToken: newAccess },
              'Refreshed'
            )
          )
  } catch (err: any) {
    console.log("Refresh error:",err)
    throw new ApiError(401, err?.message || 'Invalid refresh token')
  }
})
