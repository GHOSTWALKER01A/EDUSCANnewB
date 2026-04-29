import { Router } from 'express';
import { getDashboardOverview } from '../controllers/adminDashboard.controller.js';
import { verifyJWT } from '../middlewares/auth.js';
import { restrictTo } from '../middlewares/restrictTo.js';

const router = Router();

router.use(verifyJWT);
router.use(restrictTo('admin'));

// GET /api/admin/dashboard
router.get('/', getDashboardOverview);

export default router;
