// src/routes/resources.routes.ts
import { Router } from 'express';
import { createResource, getResources, getResourceById, deleteResource, updateResource } from '../controllers/resources.controller.js';
import { upload } from '../middlewares/multer.js';
import { validateResource } from '../middlewares/validateResource.js';
import { verifyJWT } from '../middlewares/auth.js'; 
const router = Router();

// GET /resources
router.get('/', getResources);

// GET /resources/:id
router.get('/:id', getResourceById);

// POST /resources (teachers/admin only ideally) - multipart: 'file'
router.post('/', verifyJWT, upload.single('file'), createResource);

// DELETE /resources/:id (admin)
router.delete('/:id', verifyJWT, deleteResource);

// PUT /resources/:id (admin)
router.put('/:id', verifyJWT, upload.single('file'), updateResource);

export default router;
