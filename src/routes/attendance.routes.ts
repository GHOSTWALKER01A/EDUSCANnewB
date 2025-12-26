// src/routes/attendance.routes.ts
import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.js';
import { markAttendanceViaQR, enrollMac } from '../controllers/attendance.controller.js';

const router = Router();

router.post('/scan', verifyJWT, markAttendanceViaQR);

router.post('/enroll-mac', verifyJWT, enrollMac);

export default router;
