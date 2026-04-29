import { Router } from "express";
import {  createEvent, listEvents, getEvent, updateEvent, deleteEvent } from "../controllers/events.controller.js";
import { verifyJWT } from "../middlewares/auth.js";
import { upload } from "../middlewares/multer.js";

const router = Router()

router.get('/', verifyJWT, listEvents)

router.get('/:id',verifyJWT, getEvent)

router.post('/', verifyJWT, upload.single('file'), createEvent)

router.put('/:id', verifyJWT,upload.single('file'), updateEvent)

router.delete('/:id', verifyJWT, deleteEvent)

export default router
