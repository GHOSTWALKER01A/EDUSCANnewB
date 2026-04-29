import { Router } from 'express';
import { getGradesBySemester, getGradeSummary, getAllGrades } from '../controllers/grade.controller.js';
import { verifyJWT } from '../middlewares/auth.js';

const router = Router();

router.use(verifyJWT);

router.get('/', getAllGrades);
router.get('/summary', getGradeSummary);
router.get('/:semester', getGradesBySemester);

export default router;


