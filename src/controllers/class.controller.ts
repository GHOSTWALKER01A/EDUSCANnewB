import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asynchandler.js';
import ClassModel  from '../models/Class.model.js';
import AttendanceModel  from '../models/Attendance.model.js';
import UserModel from '../models/auth.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { generateQRToken } from '../utils/QrJwt.js';
import { isWithinWindow } from '../utils/time.js';
import crypto from 'crypto';
import speakeasy from 'speakeasy';

export const startQrSession = asyncHandler(async (req: Request, res: Response) => {
  const { classId } = req.params;
  const teacherId = (req as any).user._id;

  const cls = await ClassModel.findById(classId);

  if (!cls){
     throw new ApiError(404, 'Class not found')
    }
  
 if (!cls.teacherId || cls.teacherId.toString() !== teacherId.toString()){ 
    throw new ApiError(403, 'Not your class')
}

  if (cls.status === 'cancelled') throw new ApiError(400, 'Class cancelled');

  // Server-side validation: only in window
  if (!isWithinWindow(cls.date, cls.time)) {
    throw new ApiError(400, 'QR may only be started within the allowed time window');
  }

  if (cls.qrSession?.isActive) {
    // return existing session info (token generated freshly)
    const token = generateQRToken({
         classId: cls._id.toString(), 
         teacherId: teacherId.toString(), 
         timestamp: Date.now() 
        });
    return res.json(
        new ApiResponse(
            200,
     { sessionId: cls.qrSession.sessionId, token }
    )
  );
  }

  const sessionId = crypto.randomUUID();
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + 20 * 60000);

  // Generate a secure Base32 TOTP secret for the Golden Key mechanism
  const secret = speakeasy.generateSecret({ length: 20 });

  cls.qrSession = {
    sessionId,
    startTime,
    endTime,
    isActive: true,
    lastTokenGenerated: startTime,
    totpSecret: secret.base32
  };
  await cls.save();

  const token = generateQRToken({
     classId: cls._id.toString(),
      teacherId: teacherId.toString(),
       timestamp: Date.now() 
    });
  return res.status(201).json(
    new ApiResponse(
        201, 
    { sessionId, token, totpSecret: secret.base32, expiresIn: Number(process.env.QR_TOKEN_EXPIRES_SECONDS || '15') },
     'QR started'
    ));
});

export const getQrToken = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const teacherId = (req as any).user._id;

  const cls = await ClassModel.findOne({ 'qrSession.sessionId': sessionId });

  if (!cls) throw new ApiError(404, 'Session not found');

  if (!cls.teacherId || cls.teacherId.toString() !== teacherId.toString()) {
    throw new ApiError(403, 'Not authorized for this session');
}

  const now = new Date();
  if (!cls.qrSession?.isActive || now < (cls.qrSession.startTime!) || now > (cls.qrSession.endTime!)) {
    throw new ApiError(400, 'Session not active');
  }

  const token = generateQRToken({
     classId: cls._id.toString(),
      teacherId: teacherId.toString(),
       timestamp: Date.now() 
    });
    
  cls.qrSession.lastTokenGenerated = now;
  await cls.save();
  return res.json(
    new ApiResponse(
        200,
     { token, totpSecret: cls.qrSession.totpSecret, expiresIn: Number(process.env.QR_TOKEN_EXPIRES_SECONDS || '15') },
      'Token generated'
    ));
});

export const endQrSession = asyncHandler(async (req: Request, res: Response) => {
  const { classId } = req.params;
  const teacherId = (req as any).user._id;

  const cls = await ClassModel.findById(classId);

  if (!cls) throw new ApiError(404, 'Class not found');
  
  if (!cls.teacherId || cls.teacherId.toString() !== teacherId.toString()) {
    throw new ApiError(403, 'Not authorized')
}


  cls.qrSession = { ...cls.qrSession, isActive: false };
  await cls.save();
  return res.json(new ApiResponse(200, {}, 'Session ended'));
});

export const getTodayClasses = asyncHandler(async (req: Request, res: Response) => {
  const teacherId = (req as any).user._id;

  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);

  const classes = await ClassModel.find({
     teacherId, 
     date: { $gte: today, $lt: tomorrow }, 
     classStatus: { $ne: 'cancelled' }
     });
  return res.json(
    new ApiResponse(
        200, 
        { classes },
         'Classes fetched'
    ));
});

export const getClassStudents = asyncHandler(async (req: Request, res: Response) => {
  const { classId } = req.params;
  
  const cls = await ClassModel.findById(classId);
  if (!cls) {
    throw new ApiError(404, 'Class not found');
  }

  // Fetch all students matching branch and semester
  const query: any = { role: 'student' };
  if (cls.branch) query.branch = cls.branch;
  if (cls.semester) query.semester = cls.semester;

  const allStudents = await UserModel.find(query)
    .select('_id fullname registrationNo')
    .lean();

  // Fetch actual attendance records
  const attendances = await AttendanceModel.find({ classId }).lean();
  
  const attendanceMap = new Map();
  attendances.forEach(a => {
    attendanceMap.set(a.studentId.toString(), a);
  });

  const students = allStudents.map(student => {
    const record = attendanceMap.get(student._id.toString());
    
    // Determine status: Default to pending, unless class is completed/ongoing or record exists
    let status = 'pending';
    if (cls.status === 'completed' || cls.status === 'ongoing') {
       status = 'absent';
    }
    
    if (record) {
       status = record.isValid ? 'present' : 'absent';
    }

    return {
      id: student._id.toString(),
      regNo: student.registrationNo || 'N/A',
      name: student.fullname,
      present: status === 'present',
      status: status,
      method: record?.method
    };
  });

  // Sort by registration number alphabetically
  students.sort((a, b) => a.regNo.localeCompare(b.regNo));

  return res.json(
    new ApiResponse(
        200, 
        { students },
         'Students fetched'
        ));
});

export const cancelClass = asyncHandler(async (req: Request, res: Response) => {
  const { classId } = req.params;
  const teacherId = (req as any).user._id;

  const cls = await ClassModel.findById(classId);

  if (!cls) throw new ApiError(404, 'Class not found');

 if (!cls.teacherId || cls.teacherId.toString() !== teacherId.toString()) {
    throw new ApiError(403, 'Not authorized');
}
  cls.status = 'cancelled';

  await cls.save();
  return res.json(
    new ApiResponse(
        200,
         cls,
         'Class cancelled'
        ));
});

export const rescheduleClass = asyncHandler(async (req: Request, res: Response) => {
  const { classId } = req.params;
  const { newDate, newTime, newRoom } = req.body;
  const teacherId = (req as any).user._id;

  const cls = await ClassModel.findById(classId);

  if (!cls) throw new ApiError(404, 'Class not found');
  
 if (!cls.teacherId || cls.teacherId.toString() !== teacherId.toString()){
    throw new ApiError(403, 'Not authorized');
}
  cls.date = new Date(newDate);
  cls.time = newTime;
  cls.room = newRoom;
  cls.classStatus = 'rescheduled';

  await cls.save();

  return res.json(
    new ApiResponse(
        200, 
        { cls }, 
        'Class rescheduled'
    ));
});

export const confirmClass = asyncHandler(async (req: Request, res: Response) => {
  const { classId } = req.params;
  const teacherId = (req as any).user._id;

  const cls = await ClassModel.findById(classId);

  if (!cls) throw new ApiError(404, 'Class not found');
  
  if (!cls.teacherId || cls.teacherId.toString() !== teacherId.toString()){
    throw new ApiError(403, 'Not authorized');
  }

  if (cls.status === 'cancelled') throw new ApiError(400, 'Class is cancelled');

  cls.isConfirmed = true;

  await cls.save();

  return res.json(
    new ApiResponse(
      200, 
      { cls }, 
      'Class confirmed successfully. A notification will be sent before class.'
    )
  );
});
