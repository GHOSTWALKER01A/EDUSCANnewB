
import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.js';
import { getAssignments, createAssignment, updateAssignment, deleteAssignment } from '../controllers/assignment.controller.js';
import { upload } from '../middlewares/multer.js'; 

const router = Router();

router.get('/', verifyJWT, getAssignments);

router.post('/', verifyJWT, upload.single('file'), createAssignment);

router.put('/:id', verifyJWT, upload.single('file'), updateAssignment);

router.delete('/:id', verifyJWT, deleteAssignment);

export default router;
