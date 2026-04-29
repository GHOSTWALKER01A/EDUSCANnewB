// src/controllers/doubt.controller.ts
import { Request, Response, NextFunction } from 'express';
import DoubtModal from '../models/Doubt.model.js';
import { uploadOnCloudinary } from '../services/Cloudinary.service.js'
import { asyncHandler } from '../utils/asynchandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { upload } from '../middlewares/multer.js';




export const createDoubt = asyncHandler(async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    console.log('--- createDoubt called ---');
    console.log('user:', req.user?._id);
    console.log('body keys:', Object.keys(req.body));
    console.log('files count:', Array.isArray(req.files) ? req.files.length : 0);

    const user = req.user;
    if (!user) throw new ApiError(401, 'Unauthorized');

    const { subject, teacherId, description } = req.body ?? {};
    if (!subject || !subject.trim()) throw new ApiError(400, 'Subject is required');
    if (!description || !description.trim()) throw new ApiError(400, 'Description is required');

    const files = (req.files as Express.Multer.File[] | undefined) || [];
    const attachments: any[] = [];

    for (const f of files) {
      try {
        const up = await uploadOnCloudinary(f.path, 'http://localhost:4000/api/doubts'); // ensure uploadOnCloudinary throws helpful errors
        attachments.push({
          url: up.url,
          fileName: f.originalname,
          fileType: up.raw?.resource_type || f.mimetype,
          publicId: up.public_id
        });
      } catch (uploadErr) {
        console.error('Cloudinary upload error for file:', f.path, uploadErr);
        
        throw new ApiError(500, 'Failed to upload attachment: ' + String(uploadErr));
      }
    }

    const doubt = await DoubtModal.create({
      studentId: user._id,
      teacherId: teacherId || undefined,
      subject: subject.trim(),
      description: description.trim(),
      attachments
    });

    await doubt.populate('studentId', 'fullname branch semester');

    try { req.app.get('io')?.emit('doubt:created', doubt); } catch (e) { console.warn('socket emit failed', e); }

    return res.status(201).json(new ApiResponse(201, { doubt }, 'Doubt created'));
  } catch (err) {
    console.error('createDoubt caught error:', err);
    next(err);
  }
});


export const listDoubts = asyncHandler(async (req: Request & { user?: any }, res: Response) => {
  const user = req.user;
  const filter: any = {};
  if (user.role === 'student') filter.studentId = user._id;
  else if (user.role === 'teacher') filter.teacherId = user._id;

  const doubts = await DoubtModal.find(filter)
    .sort({ createdAt: -1 })
    .populate('studentId', 'fullname branch semester')
    .populate('teacherId', 'fullname')
    .lean();

  return res.status(200).json(new ApiResponse(
    200,
     { doubts },
      'Doubts fetched')
    );
});

export const getDoubtOverview = asyncHandler(async (req: Request & { user?: any }, res: Response) => {
  const user = req.user;
  const filter: any = { status: 'open' };
  
  if (user.role === 'student') filter.studentId = user._id;
  else if (user.role === 'teacher') filter.teacherId = user._id;

  const count = await DoubtModal.countDocuments(filter);

  return res.status(200).json(new ApiResponse(
    200,
    { count },
    'Doubt overview fetched'
  ));
});


export const getDoubt = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  const doubt = await DoubtModal.findById(id)
  .populate('studentId', 'fullname branch semester')
  .populate('teacherId', 'fullname')
  .lean();

  if (!doubt) throw new ApiError(404, 'Doubt not found');

  return res.status(200).json(new ApiResponse(
    200, 
    { doubt }, 
    'Doubt fetched'
)
);
});


export const replyDoubt = asyncHandler(async (req: Request & { user?: any }, res: Response) => {
  const { message } = req.body;
  const user = req.user;
  if (!user) throw new ApiError(401, 'Unauthorized teacher');

  const files = (req.files as Express.Multer.File[] | undefined) || [];
  const attachments: any[] = [];
  for (const f of files) {
    const up = await uploadOnCloudinary(f.path, '/api/doubts/replies');
    attachments.push({ url: up.url, fileName: f.originalname,
         fileType: up.raw.resource_type || f.mimetype,
          publicId: up.public_id 
        }
    );
  }

  const reply = {
    by: { _id: user._id, fullname: user.fullname, role: user.role },
    message,
    attachments
  };

  const doubt = await DoubtModal.findByIdAndUpdate(req.params.id, {
    $push: { replies: reply },
    $set: { status: user.role === 'teacher' ? 'answered' : undefined }
  }, { new: true }).populate('studentId', 'fullname branch semester');

  if (!doubt) throw new ApiError(404, 'Doubt not found');

  // emit update
  req.app.get('io')?.emit('doubt:updated', doubt);

  return res.status(201).json(new ApiResponse(201, { doubt }, 'Reply added'));
});


export const deleteDoubt = asyncHandler(async (req: Request & { user?: any }, res: Response) => {
  const user = req.user;
  const doubt = await DoubtModal.findById(req.params.id);
  if (!doubt) throw new ApiError(404, 'Not found');

  if (user.role === 'student' && doubt.studentId.toString() !== user._id.toString()) {
    throw new ApiError(403, 'Forbidden');
  }

  await doubt.deleteOne();
  req.app.get('io')?.emit('doubt:deleted', req.params.id);
  return res.status(200).json(new ApiResponse(200, {}, 'Doubt deleted'));
});

export const updateDoubt = asyncHandler(async (req: Request & { user?: any }, res: Response) => {
  const user = req.user;
  const { id } = req.params;
  const { subject, description, teacherId } = req.body;

  const doubt = await DoubtModal.findById(id);
  if (!doubt) throw new ApiError(404, 'Doubt not found');

  if (user.role === 'student' && doubt.studentId.toString() !== user._id.toString()) {
    throw new ApiError(403, 'Forbidden to edit this doubt');
  }

  // Update fields if provided
  if (subject) doubt.subject = subject.trim();
  if (description) doubt.description = description.trim();
  if (teacherId !== undefined) doubt.teacherId = teacherId;

  // Wait, what about attachments? For simplicity, we can let them update text/teacher.
  // Full attachment update requires more logic, usually students just edit text.

  await doubt.save();
  await doubt.populate('studentId', 'fullname branch semester');
  await doubt.populate('teacherId', 'fullname'); // also populate teacher

  req.app.get('io')?.emit('doubt:updated', doubt);

  return res.status(200).json(new ApiResponse(200, { doubt }, 'Doubt updated'));
});
