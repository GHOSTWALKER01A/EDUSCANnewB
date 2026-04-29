
import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.js';
import { getProfile, updateProfile } from '../controllers/student.controller.js';
import { upload } from '../middlewares/multer.js';
import { getStudentMetrics } from '../controllers/studentMetrics.controllers.js';


const router = Router();

router.get('/profile', verifyJWT, getProfile);

router.put('/profile', verifyJWT, upload.fields([{ name: 'profilephoto', maxCount: 1 }]), updateProfile);

router.get('/metrics', verifyJWT, getStudentMetrics);

export default router;
