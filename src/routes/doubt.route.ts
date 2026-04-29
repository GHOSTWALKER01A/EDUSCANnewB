import Router from "express";
import { createDoubt, deleteDoubt, getDoubt, listDoubts, replyDoubt, getDoubtOverview, updateDoubt } from "../controllers/doubt.controller.js";
import {validateDoubt} from "../middlewares/validateDoubt.js"
import { upload } from "../middlewares/multer.js";
import { verifyJWT } from "../middlewares/auth.js";
const router = Router();

router.get('/', verifyJWT, listDoubts);
router.get('/overview', verifyJWT, getDoubtOverview);
router.get('/:id', verifyJWT, getDoubt);

// create: multipart with attachments[]
router.post('/', verifyJWT, upload.array('attachments', 5), createDoubt);

// reply: multipart attachments[]
router.post('/:id/reply', verifyJWT, upload.array('attachments', 5), replyDoubt);

router.put('/:id', verifyJWT, updateDoubt);
router.delete('/:id', verifyJWT, deleteDoubt);

export default router;
