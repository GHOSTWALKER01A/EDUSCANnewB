import { Router } from 'express';
import {startQrSession, getQrToken, endQrSession, getTodayClasses, 
    getClassStudents, cancelClass, rescheduleClass, confirmClass} from '../controllers/class.controller.js';
import { verifyJWT } from '../middlewares/auth.js';

const router = Router();

router.post('/qr/start/:classId', verifyJWT, startQrSession);
router.get('/qr/current/:sessionId', verifyJWT, getQrToken);
router.post('/qr/end/:classId', verifyJWT, endQrSession);

router.get('/today', verifyJWT, getTodayClasses);
router.get('/:classId/students', verifyJWT, getClassStudents);
router.put('/cancel/:classId', verifyJWT, cancelClass);
router.put('/reschedule/:classId', verifyJWT, rescheduleClass);
router.put('/confirm/:classId', verifyJWT, confirmClass);



export default router;