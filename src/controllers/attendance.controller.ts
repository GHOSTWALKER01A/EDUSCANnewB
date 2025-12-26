// src/controllers/attendance.controller.ts
import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asynchandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import  ClassModel  from '../models/Class.model.js'; // ensure Class model exists
import  UserModal  from '../models/auth.model.js';
import AttendanceModal from '../models/Attendance.model.js';
import  {getRedis}  from '../services/Redis.js';
import geolib from 'geolib';
import jwt from 'jsonwebtoken';



// constants
const QR_TOKEN_TTL = 30; // seconds for QR token freshness
const GEO_DISTANCE_LIMIT_METERS = 12; // 12 meters



// POST /attendance/enroll-mac
export const enrollMac = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
  
    const { macAddress } = req.body;
  
    if (!macAddress) throw new ApiError(400, 'macAddress required');
  
    const user = await UserModal.findById(userId);
  
    if (!user || user.role !== 'student') throw new ApiError(403, 'Only students can enroll MAC');
  
    user.macAddress = macAddress;
    // The model pre-save should hash macAddress -> macHash
    await user.save();
  
    return res.status(201).json(new ApiResponse(201, { macHash: user.macHash }, 'MAC enrolled'));
  } catch (error:any) {
    console.log("error in enrollMac",error)
    throw new ApiError(500,'Internal Server Error in enrollMac')
  }
});

// POST /attendance/scan  (QR + geolocation)
export const markAttendanceViaQR = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { scannedData, qrToken, latitude, longitude } = req.body;
  if (!scannedData) throw new ApiError(400, 'scannedData required');
try {
    
      const user = await UserModal.findById(userId);
      if (!user || user.role !== 'student') throw new ApiError(403, 'Only students can mark via QR');
    
      // Option A: If frontend sends a qrToken (signed JWT from teacher), verify it.
      if (qrToken) {
        try {
          const decoded = jwt.verify(qrToken, process.env.QR_TOKEN_SECRET as string) as any;
          const { classId, teacherId, timestamp } = decoded;
          // ensure token timeframe
          if (Date.now() - timestamp > (QR_TOKEN_TTL * 1000)) throw new ApiError(401, 'QR expired');
    
          const cls = await ClassModel.findById(classId);
          if (!cls) throw new ApiError(404, 'Class not found');
    
          // check not already present
          const existing = await AttendanceModal.findOne({ classId, studentId: userId });
          if (existing) throw new ApiError(400, 'Already marked');
    
          // optional: distance check if teacher location available on class model
          if (latitude && longitude && cls.teacher_latitude && cls.teacher_longitude) {
            const d = geolib.getDistance({ latitude, longitude }, { latitude: cls.teacher_latitude, longitude: cls.teacher_longitude });
            if (d > GEO_DISTANCE_LIMIT_METERS) throw new ApiError(401, 'Too far from teacher location');
          }
    
          const attendance = await AttendanceModal.create({
            classId,
            studentId: userId,
            teacherId,
            method: 'manual',
            status: 'present',
            student_latitude: latitude,
            student_longitude: longitude,
            token: qrToken,
          });
    
          // update class counts
          cls.totalStudents = await AttendanceModal.countDocuments({ classId: cls._id });
          await cls.save();
    
          // emit socket.io event if works
          req.app.get('io')?.emit('attendanceMarked', { studentId: userId, classId: cls._id });
    
          return res.status(200).json(new ApiResponse(200, { attendance }, 'Attendance marked via QR'));
        } catch (err: any) {
          if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') throw new ApiError(401, 'Invalid QR token');
          throw err;
        }
      }
    
      // Option B: scannedData is vCard-like content with teacherId & subject. We'll parse it.
      const lines: string[] = String(scannedData).split('\n').map(l => l.trim());
      const parsed = { teacherId: '', teacherName: '', subject: '' };
      lines.forEach(l => {
        if (l.startsWith('UID:')) parsed.teacherId = l.replace('UID:', '').trim();
        if (l.startsWith('FN:')) parsed.teacherName = l.replace('FN:', '').trim();
        if (l.startsWith('SUBJECT:')) parsed.subject = l.replace('SUBJECT:', '').trim();
      });
    
      if (!parsed.teacherId || !parsed.subject) throw new ApiError(400, 'Invalid QR content');
    
      const teacher = await UserModal.findOne({ registrationNo: parsed.teacherId, role: 'teacher' });
      if (!teacher) throw new ApiError(400, 'QR from unknown teacher');
    
      // find today's class for that teacher and subject
      const now = new Date();
      const start = new Date(now); start.setHours(0,0,0,0);
      const end = new Date(start); end.setDate(start.getDate()+1);
    
      const cls = await ClassModel.findOne({
        teacherId: teacher._id,
        subject: parsed.subject,
        date: { $gte: start, $lt: end },
        status: { $ne: 'cancelled' },
      });
    
      if (!cls) throw new ApiError(404, 'Class not found for this QR');
    
      // duplicate check
      const existing = await AttendanceModal.findOne({ 
        classId: cls._id, 
        studentId: userId 
      });

      if (existing) throw new ApiError(400, 'Already marked attendance for this class');
    
      // check distance
      if (latitude && longitude && cls.teacher_latitude && cls.teacher_longitude) {
        const d = geolib.getDistance({ latitude, longitude },
             { latitude: cls.teacher_latitude, longitude: cls.teacher_longitude });
        
        if (d > GEO_DISTANCE_LIMIT_METERS) throw new ApiError(401, 'You are not within the allowed distance (12m)');
      }
    
      const attendance = await AttendanceModal.create({
        classId: cls._id,
        studentId: userId,
        teacherId: teacher._id,
        method: 'manual',
        status: 'present',
        student_latitude: latitude,
        student_longitude: longitude,
        token: scannedData
      });
    
      cls.totalStudents = await AttendanceModal.countDocuments({ classId: cls._id });
      await cls.save();
    
      req.app.get('io')?.emit('attendanceMarked',
         { studentId: userId, classId: cls._id });

      return res.status(200).json(new ApiResponse(
        200,
         { attendance, class: cls._id, ...parsed },
          'Attendance marked successfully via QR'
        ));
} catch (error:any) {
    console.log("error in markAttendanceViaQR",error)
    throw new ApiError(500,'Internal Server Error in markAttendanceViaQR')  
}
});
