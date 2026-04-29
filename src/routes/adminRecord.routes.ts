import { Router } from 'express';
import { 
  getStudents, 
  toggleStudentBlock, 
  getTeachers, 
  updateTeacherStatus 
} from '../controllers/adminRecord.controller.js';
import { verifyJWT }  from '../middlewares/auth.js';
import { restrictTo } from '../middlewares/restrictTo.js';

const router = Router();

// All admin-record routes require a logged-in admin
router.use(verifyJWT);
router.use(restrictTo('admin'));

// Student Routes
router.get('/students', getStudents);
router.patch('/students/:id/block', toggleStudentBlock);

// Teacher Routes
router.get('/teachers', getTeachers);
router.patch('/teachers/:id/status', updateTeacherStatus);

export default router;
