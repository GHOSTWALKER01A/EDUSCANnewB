// src/controllers/resources.controller.ts
import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asynchandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import  ResourceModal  from '../models/Resource.modal.js';
import { uploadOnCloudinary, deleteFromCloudinary } from '../services/Cloudinary.service.js'
import { CreateResourceInput } from "../schemas/Resource.schemas.js";
import slugify from '@sindresorhus/slugify';
import fs from 'fs';

const PAGINATION_DEFAULT = 8

export const listResource = asyncHandler(async (req: Request, res: Response) => {
 const page = Math.max(1, parseInt(String(req.query.page||'1')));
  const perPage = Math.max(1, parseInt(String(req.query.perPage||PAGINATION_DEFAULT)));
  const q = String(req.query.q||'').trim();

  const filter: any = {};
   if(q) filter.$or = [{ title: new RegExp(q, 'i') }, { resourceType: new RegExp(q, 'i') }];
  const total = await ResourceModal.countDocuments(filter);
  const items = await ResourceModal.find(filter)
  .sort({ createdAt: -1 })
  .skip((page-1)*perPage)
  .limit(perPage)
  .populate('uploadedBy', 'fullname')
  .lean();  

  

  return res.status(200).json(
    new ApiResponse(
        200,
        { data: { materials: items, total } },
         'Resources fetched'
        )
    );
}); 



export const createResource = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreateResourceInput;
  const file = (req as any).file as Express.Multer.File | undefined;

  if (!file) throw new ApiError(400, 'File is required');

  try {
    const uploaded = await uploadOnCloudinary(file.path,
      slugify(body.title || "resource", { lowercase: true,separator: "-" })
      );
  
    const resourceDoc = await ResourceModal.create({
      title: body.title,
      description: body.description,
      fileUrl: uploaded.url,
      fileType: uploaded.format ? uploaded.format : file.mimetype,
      fileSize: file.size,
      resourceType: body.resourceType,
      uploadedBy: (req as any).user?._id,
      publicId: uploaded.public_id
    });
  
    // populate uploader info (optional)
    await resourceDoc.populate('uploadedBy', 'fullname');
  
    // Emit socket event
    try {
      const io = req.app.get('io');
      io?.emit('resource:created', resourceDoc);
    } catch (e) {
      // failing to emit shouldn't block response
      console.warn('Socket emission failed', e);
    }
  
    return res.status(201).json(
        new ApiResponse(
            201, 
         { resource: resourceDoc },
         'Resource created'
        ));
  } catch (error:any) {
    console.error("Error creating resource:", error.message);
     if(file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
     throw new ApiError(500, 'Failed to create resource');
  }
});


export const getResources = asyncHandler(async (req: Request, res: Response) => {
  const { type, search, page = '1', limit = '12', sort = '-createdAt' } = req.query as any;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10) || 12));

  const filter: any = {};
  if (type) filter.resourceType = type;
  if (search) filter.$text = { $search: search };

  const total = await ResourceModal.countDocuments(filter);
  const resources = await ResourceModal.find(filter)
    .sort(sort)
    .skip((pageNum - 1) * pageSize)
    .limit(pageSize)
    .populate('uploadedBy', 'fullname');


  return res.status(200).json(
    new ApiResponse(
        200, 
    { resources, page: pageNum, limit: pageSize, total },
     'Resources fetched'    
    )
    );
});

export const getResourceById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const resource = await ResourceModal.findById(id).populate('uploadedBy', 'fullname');
  if (!resource) throw new ApiError(404, 'Resource not found');
  return res.status(200).json(new ApiResponse(200, { resource }, 'Resource found'));
});

// optional delete
export const deleteResource = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const resource = await ResourceModal.findById(id);
  if (!resource) throw new ApiError(404, 'Resource not found');

  await deleteFromCloudinary(resource.publicId || '');
  
  await resource.deleteOne();
   req.app.get('io')?.emit('resource:deleted', { id });

  return res.status(200).json(
    new ApiResponse(
        200,
         {},
          'Resource deleted'
        )
    );
});


export const updateResource = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const resource = await ResourceModal.findById(id);
  if (!resource) {
    throw new ApiError(404, 'Resource not found');
  }

  const body = req.body as Partial<CreateResourceInput>;
  const file = (req as any).file as Express.Multer.File | undefined;

  
  if (body.title !== undefined) {
    resource.title = body.title;
  }

  if (body.description !== undefined) {
    resource.description = body.description;
  }

  if (body.resourceType !== undefined) {
    resource.resourceType = body.resourceType;
  }

 
  if (body.fileRemoved === '1' && resource.publicId) {
    await deleteFromCloudinary(resource.publicId);
    resource.fileUrl = undefined;
    resource.fileType = undefined;
    resource.fileSize = undefined;
    resource.publicId = undefined;
  }

 
  if (file) {
    // delete old file safely
    if (resource.publicId) {
      await deleteFromCloudinary(resource.publicId);
    }

    const uploaded = await uploadOnCloudinary(
      file.path,
      slugify(
        body.title || resource.title || 'resource',
        { lowercase: true, separator: '-' }
      )
    );
    console.log("Resouce file type", uploaded);

    resource.fileUrl = uploaded.url;
    resource.fileType = uploaded.format || file.mimetype;
    resource.fileSize = file.size;
    resource.publicId = uploaded.public_id;
  }

  await resource.save();
 
   req.app.get('io')?.emit('resource:updated', resource);

  console.log("Resource updated",resource);

  return res.status(200).json(
    new ApiResponse(
      200,
       { resource },
        'Resource updated successfully')
  );
});

