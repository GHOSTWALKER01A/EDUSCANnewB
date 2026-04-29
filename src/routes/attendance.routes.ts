// src/routes/attendance.routes.ts
import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.js';
import {listAttendance, getSummary, getSeries, markAttendanceViaQR, enrollMac, getSubjectWiseAttendance, ingestTelemetryWebhook, finalizeLectureAttendance } from '../controllers/attendance.controller.js';

const router = Router();

router.get('/', verifyJWT, listAttendance); 
router.get('/summary', verifyJWT, getSummary); 
router.get('/series', verifyJWT, getSeries);

router.post('/scan', verifyJWT, markAttendanceViaQR);

router.post('/enroll-mac', verifyJWT, enrollMac);

router.get('/subject-wise', verifyJWT, getSubjectWiseAttendance);

router.post('/telemetry/webhook', ingestTelemetryWebhook);
router.post('/finalize/:classId', verifyJWT, finalizeLectureAttendance);

export default router;
