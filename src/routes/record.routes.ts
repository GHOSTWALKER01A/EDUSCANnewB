
import { Router } from 'express';
import { listStudents, toggleBlockStudent, getStudentById } from '../controllers/record.controller.js';
import {verifyJWT} from '../middlewares/auth.js';

const router = Router();


router.get('/', verifyJWT, listStudents);

router.get('/:id', verifyJWT, getStudentById);

router.put('/:id/block', verifyJWT, toggleBlockStudent);

export default router;