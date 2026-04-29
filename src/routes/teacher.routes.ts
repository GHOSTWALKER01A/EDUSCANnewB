import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.js';
import { getProfile, updateProfile, getTeacherAttendanceStats } from '../controllers/teacher.controller.js';
import { upload } from '../middlewares/multer.js';

const router = Router();

router.get('/profile', verifyJWT, getProfile);

router.put('/profile', verifyJWT, upload.fields([{ name: 'profilephoto', maxCount: 1 }]), updateProfile);

router.get('/attendance-stats', verifyJWT, getTeacherAttendanceStats);

export default router;
