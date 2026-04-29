import { Request, Response } from 'express'
import  EventModel  from '../models/Event.modal.js'
import { uploadOnCloudinary, deleteFromCloudinary } from '../services/Cloudinary.service.js'
import { asyncHandler } from '../utils/asynchandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import fs from 'fs';
import slugify from '@sindresorhus/slugify'
import { CreateEventInput } from '../schemas/event.schema.js';


type MulterRequest = Request & {
  file?: Express.Multer.File;
  user?: any;
};


// Create
export const createEvent = asyncHandler(async (req: MulterRequest, res: Response) => {
 
  const {title, description, category, startDate, endDate, startTime, endTime, location} = req.body as CreateEventInput;
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!title) throw new ApiError(400, 'Title is required');
  // if (!description) throw new ApiError(400, 'Description is required');
  if (!category) throw new ApiError(400, 'Category is required');
  if (!startDate) throw new ApiError(400, 'Start Date is required');
  if (!endDate) throw new ApiError(400, 'End Date is required');
  if (!startTime) throw new ApiError(400, 'Start Time is required');
  if (!endTime) throw new ApiError(400, 'End Time is required');
  // if (!location) throw new ApiError(400, 'Location is required');

  const teacherId = req.user?._id;
  if (!teacherId) throw new ApiError(401, 'Unauthorized');

  try {
    

    let mediaData = { mediaUrl: undefined as string 
      | undefined, mediaType: 'none' as any,
       mediaPublicId: undefined as string | undefined, mediaSize: undefined as number | undefined };

    if (file) {
      const uploaded =  await uploadOnCloudinary(file.path,
        slugify(title || "resource", { lowercase: true,separator: "-" })
        );
      mediaData.mediaUrl = uploaded.url;
      mediaData.mediaPublicId = uploaded.public_id;
      mediaData.mediaType = uploaded.resource_type;
      mediaData.mediaSize = file.size;
    }

    const event = await EventModel.create({
      teacherId,
      createdBy: teacherId, 
      title,
      description,
      category: category || 'general',
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      startTime: startTime ? new Date(startTime).toISOString() : undefined,
      endTime: endTime ? new Date(endTime).toISOString() : undefined,
      location,
      mediaUrl: mediaData.mediaUrl,
      mediaType: mediaData.mediaType,
      mediaPublicId: mediaData.mediaPublicId,
      mediaSize: mediaData.mediaSize,
    });

    
    req.app.get('io')?.emit('event:created', event);

    return res.status(201).json(
      new ApiResponse(
        201,
       { event },
      'Event created'
        ));
  } catch (error: any) {
    console.error("Error creating event:", error);
   if (file && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch (e) {
        console.error('Error removing file:', e);
      }
    }
    console.error('Error creating event:', error);

    // If Mongoose ValidationError, send back the validation details
    if (error.name === 'ValidationError' && error.errors) {
      const details = Object.keys(error.errors).reduce((acc: any, k: any) => {
        acc[k] = error.errors[k].message || error.errors[k].kind || true;
        return acc;
      }, {});
      return res.status(400).json({ success: false, message: 'Validation failed', details });
    }
    throw new ApiError(500, 'Failed to create event');
  }
});



export const listEvents = asyncHandler(async (req: Request & { user?: any }, res: Response) => {

  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const perPage = Math.min(100, Math.max(1, parseInt(String(req.query.perPage || req.query.per_page || '10'), 10)));
  const q = (req.query.q || '').toString().trim();
  const teacherFilter = (req.query.teacherId || '').toString().trim();
  const categoryFilter = (req.query.category || '').toString().trim();

  const filter: any = {};
  if (teacherFilter) filter.teacherId = teacherFilter;
  if (categoryFilter) filter.category = categoryFilter;

  if (q) {
    filter.$text = { $search: q };
  }

  const [total, events] = await Promise.all([
    EventModel.countDocuments(filter),
    EventModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate('teacherId', 'fullname')
      .lean()
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
       { events, total, page, perPage },
        'Events fetched successfully'
      ));
});


// Get one
export const getEvent = asyncHandler(async (req: Request, res: Response) => {
   const { type, search, page = '1', limit = '12', sort = '-createdAt' } = req.query as any;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10) || 12));

  const filter: any = {};
  if (type) filter.resourceType = type;
  if (search) filter.$text = { $search: search };

  const total = await EventModel.countDocuments(filter);
  const event = await EventModel.find(filter)
    .sort(sort)
    .skip((pageNum - 1) * pageSize)
    .limit(pageSize)
    .populate('teacherId', 'fullname');

   console.log("Events Created ",event)
   
  return res.status(200).json(
    new ApiResponse(
        200, 
    { event, page: pageNum, limit: pageSize, total },
     'Events fetched successfully'    
    )
    );
});


export const updateEvent = asyncHandler(async (req: MulterRequest, res: Response) => {
  const {id} = req.params;

  const event = await EventModel.findById(id);

  if (!event) throw new ApiError(404, 'Event not found');

  const body = req.body as Partial<CreateEventInput>;
  const file = (req as any).file as Express.Multer.File | undefined;

  if (body.title !== undefined) {
    event.title = body.title;
  }

  if (body.description !== undefined) {
    event.description = body.description;
  }

  if (body.category !== undefined) {
    event.category = body.category;
  }

  if (body.startDate !== undefined) {
    event.startDate = body.startDate;
  }

  if (body.endDate !== undefined) {
    event.endDate = body.endDate;
  }

  if (body.startTime !== undefined) {
    event.startTime = body.startTime;
  }

  if (body.endTime !== undefined) {
    event.endTime = body.endTime;
  }

  if (body.location !== undefined) {
    event.location = body.location;
  }
  if (body.mediaType !== undefined) {
    event.mediaType = body.mediaType;
  }



  if (body.fileRemoved === '1' && event.mediaPublicId) {
    await deleteFromCloudinary(event.mediaPublicId);
    event.mediaUrl = undefined;
    event.mediaType = undefined;
    event.mediaSize = undefined;
    event.mediaPublicId = undefined;
  }
  
  if (file) {
    if (event.mediaPublicId) {
      await deleteFromCloudinary(event.mediaPublicId);
    }


    const uploaded = await uploadOnCloudinary(
      file.path,
      slugify(
         body.title || event.title || 'event',
        { lowercase: true, separator: '-' }
      )
    );

    console.log("Event file type",uploaded)

    event.mediaUrl = uploaded.url;
    event.mediaPublicId = uploaded.public_id;
    event.mediaType = uploaded.format || file.mimetype;
    event.mediaSize = file.size;
  }

  await event.save();
  console.log(event);

  req.app.get('io')?.emit('event:updated', event);

  return res.status(200).json(
    new ApiResponse(
      200, 
      { event },
       'Event updated successfully'
      ));
});


// Delete
export const deleteEvent = asyncHandler(async (req: MulterRequest, res: Response) => {
  const{ id }= req.params;

  const existing = await EventModel.findById(id);
  if (!existing) throw new ApiError(404, 'Event not found');

  if (existing.mediaPublicId) {
    
    await deleteFromCloudinary(existing.mediaPublicId || '');
  }

  await existing.deleteOne();

  req.app.get('io')?.emit('event:deleted', { id });

  return res.status(200).json(
    new ApiResponse(
      200,
       {}, 
       'Event deleted successfully'
      ));
});

