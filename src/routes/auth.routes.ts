// src/routes/auth.routes.ts
import { Router } from 'express'
import { upload } from '../middlewares/multer.js'
import {
  registerUser, loginUser, logoutUser,sendOTP,
   verifyOTP, resetPassword, refreshAccessToken
} from '../controllers/auth.controller.js'
import { verifyJWT } from '../middlewares/auth.js'
// import { registerSchema, loginSchema } from '../schemas/signUp.schema.js'

const router = Router()

router.post('/register', upload.fields([{ name: 'profilephoto', maxCount: 1 }]), registerUser)

router.post('/login', loginUser)
// OTP flows are public:
router.post('/send-otp', sendOTP)
router.post('/verify-otp', verifyOTP)   
router.post('/reset-password', resetPassword)

// Protected:
router.post('/logout', verifyJWT, logoutUser)
router.post('/refresh', refreshAccessToken)

export default router
