import { Router } from 'express';
import {
  getAllTimetables,
  getTimetableById,
  createTimetable,
  deleteTimetable,
  upsertPeriod,
  deletePeriod,
} from '../controllers/adminSchedule.controller.js';
import { verifyJWT } from '../middlewares/auth.js';
import { restrictTo } from '../middlewares/restrictTo.js';

const router = Router();

// All routes require an authenticated admin
router.use(verifyJWT);
router.use(restrictTo('admin'));

// Timetable CRUD
router.get('/', getAllTimetables);
router.get('/:id', getTimetableById);
router.post('/', createTimetable);
router.delete('/:id', deleteTimetable);

// Period management within a timetable
router.put('/:id/period', upsertPeriod);
router.delete('/:id/period', deletePeriod);

export default router;
