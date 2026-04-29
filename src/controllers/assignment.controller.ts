
import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asynchandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import AssignmentModel  from '../models/Assignment.model.js';
import { uploadOnCloudinary } from '../services/Cloudinary.service.js';
import fs from 'fs/promises';





// GET /assignments
export const getAssignments = asyncHandler(async (req: Request, res: Response) => {
 try {
     const userId = (req as any).user._id;

     const assignments = await AssignmentModel.find({ userId })
     .sort({ createdAt: -1 });
     return res.status(200).json(
        new ApiResponse(
            200,
            assignments,
            'Assignments fetched'
            ));
 } catch (error: any) {
    console.log('error fetching assignments',error);
    throw new ApiError(500, 'Internal Server Error');
 }
});

// POST /assignments (multipart)
export const createAssignment = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { subject, description } = req.body;
    if (!subject) throw new ApiError(400, 'Subject required');
  
    let fileUrl = '';
    let filePreview = '';
    let fileType = '';
    let fileName = '';
  
    if (req.file) {
      const file = req.file; // if you use single file input middleware .single('file')
      
      // optionally set a small preview for images (dataURL) — be careful with big files
      // READ BEFORE UPLOAD since uploadOnCloudinary unlinks the file
      if (file.mimetype.startsWith('image/')) {
        const buf = await fs.readFile(file.path);
        filePreview = `data:${file.mimetype};base64,${buf.toString('base64')}`;
      }

      const uploaded = await uploadOnCloudinary(file.path);
      
      if(uploaded){
      fileUrl = uploaded.url;
      fileType = file.mimetype;
      fileName = file.originalname;
      }
    }
  
    const assignment = await AssignmentModel.create({
      userId,
      subject,
      description,
      fileUrl,
      filePreview,
      fileType,
      fileName,
    });
  
    return res.status(201).json(
        new ApiResponse(
            201,
            assignment,
            'Assignment created'
            ));
  } catch (error:any) {
    console.log('error creating assignment',error);
    throw new ApiError(500, 'Internal Server Error');
  }
});

// PUT /assignments/:id
export const updateAssignment = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { id } = req.params;
    const { subject, description } = req.body;
  
    const assignment = await AssignmentModel.findOne({ _id: id, userId });
    if (!assignment) throw new ApiError(404, 'Assignment not found');
  
    // update fields
    if (subject) assignment.subject = subject;
    if (description) assignment.description = description;
  
    if (req.file) {
      // build preview if image BEFORE uploading since upload deletes the local file
      if (req.file.mimetype.startsWith('image/')) {
        const buf = await fs.readFile(req.file.path);
        assignment.filePreview = `data:${req.file.mimetype};base64,${buf.toString('base64')}`;
      }

      const uploaded = await uploadOnCloudinary(req.file.path);
      if(uploaded){
      assignment.fileUrl = uploaded.url;
      assignment.fileType = req.file.mimetype;
      assignment.fileName = req.file.originalname;
      }
    }
  
    await assignment.save();
    return res.status(200).json(
        new ApiResponse(
            200,
            assignment,
         'Assignment updated'
        ));
  } catch (error: any) {
    console.log('error updating assignment',error);
    throw new ApiError(500, 'Internal Server Error');
  }
});

// DELETE /assignments/:id
export const deleteAssignment = asyncHandler(async (req: Request, res: Response) => {
 try{
  const userId = (req as any).user._id;

  const { id } = req.params;

  const assignment = await AssignmentModel.findOneAndDelete({ 
    _id: id,
     userId 
    });

  if (!assignment) throw new ApiError(404, 'Assignment not found');
  return res.status(200).json(
    new ApiResponse(
        200,
         {},
        'Assignment deleted'
        )
    );
 }catch(error:any){
  console.log('error deleting assignment',error);
  throw new ApiError(500, 'Internal Server Error');
 }
});
