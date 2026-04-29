import { Router } from 'express';
import {
  getAdminAttendanceOverview,
  sendAttendanceAlert,
  exportAttendance,
} from '../controllers/adminAttendance.controller.js';
import { verifyJWT } from '../middlewares/auth.js';
import { restrictTo } from '../middlewares/restrictTo.js';

const router = Router();

// All routes are admin-only
router.use(verifyJWT);
router.use(restrictTo('admin'));

// GET  /api/admin/attendance          — paginated overview with stats
router.get('/', getAdminAttendanceOverview);

// GET  /api/admin/attendance/export   — full export payload (JSON → CSV on client)
router.get('/export', exportAttendance);

// POST /api/admin/attendance/:studentId/alert  — send a warning to a student
router.post('/:studentId/alert', sendAttendanceAlert);

export default router;
