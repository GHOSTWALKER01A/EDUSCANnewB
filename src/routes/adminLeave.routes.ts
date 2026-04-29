import { Router } from 'express';
import { getLeaves, updateLeaveStatus } from '../controllers/adminLeave.controller.js';
import { verifyJWT }  from '../middlewares/auth.js';
import { restrictTo } from '../middlewares/restrictTo.js';

const router = Router();

router.use(verifyJWT);
router.use(restrictTo('admin'));

// GET  /api/admin/leaves
router.get('/', getLeaves);

// PATCH /api/admin/leaves/:id/status
router.patch('/:id/status', updateLeaveStatus);

export default router;
