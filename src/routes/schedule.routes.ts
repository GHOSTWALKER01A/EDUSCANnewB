import { Router } from 'express';
import { 
  getTeacherSchedule, 
  getStudentSchedule, 
  getUpcomingSchedule,
  cancelPeriod, 
  reschedulePeriod 
} from '../controllers/schedule.controller.js';
import { verifyJWT } from '../middlewares/auth.js';
import { restrictTo } from '../middlewares/restrictTo.js';

const router = Router();

// Secure all schedule routes
router.use(verifyJWT);

// Upcoming (General, applies to student mainly or both)
router.get('/upcoming', getUpcomingSchedule);

// Student Route
router.get('/student', restrictTo('student'), getStudentSchedule);

// Teacher Routes
router.get('/teacher', restrictTo('teacher'), getTeacherSchedule);
router.patch('/teacher/:id/cancel', restrictTo('teacher'), cancelPeriod);
router.post('/teacher/:id/reschedule', restrictTo('teacher'), reschedulePeriod);

export default router;
