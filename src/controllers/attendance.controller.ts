
import {Request,Response, NextFunction} from 'express';
import { asyncHandler } from '../utils/asynchandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import  ClassModel  from '../models/Class.model.js'; 
import  UserModal  from '../models/auth.model.js';
import AttendanceModal from '../models/Attendance.model.js';
import { verifyQRToken } from '../utils/QrJwt.js';
// import  {getRedis}  from '../services/Redis.js';
import {Redis} from 'ioredis';
import geolib from 'geolib';
import mongoose from 'mongoose';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import { hashMacAddress, calculateGeodesicDistance } from '../utils/cryptoUtils.js';
import TelemetryModel from '../models/Telemetry.model.js';

let redis = new Redis(process.env.REDIS_URL! || 'redis://localhost:6379');


const QR_SECRET = process.env.QR_ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || 'qr_secret';
const QR_TTL_MS = Number(process.env.QR_TOKEN_TTL_MS || 15_000); // 15s

// constants
const QR_TOKEN_TTL = 30; // seconds for QR token freshness
const GEO_DISTANCE_LIMIT_METERS = 12; // 12 meters


export const listAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subject, from, to, page = '1', limit = '20' } = req.query as any;
    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, Math.min(200, parseInt(limit, 10)));

    const filter: any = {};
    if (subject) filter.subject = subject;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    // ensure only this student's rows returned
    filter.studentId = (req as any).user._id;

    const total = await AttendanceModal.countDocuments(filter);
    const rows = await AttendanceModal.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .lean();

    return res.status(200).json(new ApiResponse(200, { events: rows, page: pageNum, limit: pageSize, total }, 'Attendance fetched'));
  } catch (err) { next(err); }
};


// POST /attendance/enroll-mac
export const enrollMac = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
  
    const { plainTextMac, deviceFingerprint } = req.body;
  
    if (!plainTextMac || !deviceFingerprint) throw new ApiError(400, 'plainTextMac and deviceFingerprint required');
  
    const user = await UserModal.findById(userId);
  
    if (!user || user.role !== 'student') throw new ApiError(403, 'Only students can enroll MAC');
  
    // Generate a unique salt for cryptographic anonymization
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedMac = hashMacAddress(plainTextMac, salt);

    user.macAddress = plainTextMac;
    user.deviceFingerprint = deviceFingerprint;
    user.salt = salt;
    user.macHash = hashedMac;

    await user.save();
  
    return res.status(201).json(
      new ApiResponse(
        201,
         { macHash: user.macHash },
          'Device successfully enrolled & anonymized.'
        )
      );
  } catch (error:any) {
    console.log("error in enrollMac",error)
    throw new ApiError(500,'Internal Server Error in enrollMac')
  }
});

// --- Router Edge Telemetry Webhook (Push Model) ---
// The lecture hall router pushes this payload every 3 minutes
export const ingestTelemetryWebhook = asyncHandler(async (req: Request, res: Response) => {
  const { classId, activeMacs } = req.body; // activeMacs is an array of plaintext MACs from the router

  if (!classId || !activeMacs || !Array.isArray(activeMacs)) {
    throw new ApiError(400, 'Invalid telemetry payload.');
  }

  // Identify enrolled students with MAC addresses
  const students = await UserModal.find({ role: 'student', salt: { $exists: true, $ne: '' } }); 
  const telemetryDocs = [];

  for (const mac of activeMacs) {
    // Find matching student by hashing router's plaintext MAC using their unique salt
    const student = students.find(s => hashMacAddress(mac, s.salt!) === s.macHash);
    if (student) {
      telemetryDocs.push({
        timestamp: new Date(),
        macHash: student.macHash,
        classId
      });
    }
  }

  // High-velocity bulk insert into Time Series collection
  if (telemetryDocs.length > 0) {
      await TelemetryModel.insertMany(telemetryDocs);
  }

  return res.status(200).json(new ApiResponse(200, { captured: telemetryDocs.length }, 'Telemetry processed successfully.'));
});

// summary endpoint
export const getSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId =(req as any).user._id;
    // compute summary from Attendance collection
    const totalClasses = await AttendanceModal.countDocuments({ studentId });
    const presentCount = await AttendanceModal.countDocuments({ studentId, status: 'present' });
    const lateCount = await AttendanceModal.countDocuments({ studentId, status: 'late' });
    const absentCount = await AttendanceModal.countDocuments({ studentId, status: 'absent' });

    const attendanceRate = totalClasses === 0 ? 100 : Math.round((presentCount / totalClasses) * 100);

    const classesAttended = `${presentCount}/${totalClasses}`;

    return res.status(200).json(new ApiResponse(200, {
      classesAttended,
      attendanceRate,
      lateArrivals: lateCount,
      absences: absentCount,
      totalClasses
    }, 'Summary'));
  } catch (err) { next(err); }
};

export const getSeries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = (req as any).user._id;
    // simple aggregation by day (last 30 days)
    const series = await AttendanceModal.aggregate([
      { $match: { studentId: studentId } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, value: { $sum: { $cond: [{ $eq: ["$status","present"] }, 1, 0] } } } },
      { $sort: { _id: 1 } },
      { $limit: 60 }
    ]);
    const attendanceSeries = series.map((s: any) => ({ date: s._id, value: s.value }));
    return res.status(200).json(new ApiResponse(200, { attendanceSeries }, 'Series'));
  } catch (err) { next(err); }
};



// POST /attendance/scan  (QR + geolocation)
export const markAttendanceViaQR = asyncHandler(async (req: Request, res: Response) => {
  const studentId = (req as any).user._id;
  const { scannedData, qrToken, latitude, longitude, deviceFingerprint, accuracy, totpToken } = req.body;

  if (!scannedData && !qrToken && !totpToken)
     throw new ApiError(400, 'scannedData, qrToken or totpToken required');

try {
      const student = await UserModal.findById(studentId);
      if (!student) throw new ApiError(404, 'Student not found');

      // 1. DEVICE FINGERPRINT ANTI-PROXY CHECK
      if (deviceFingerprint && student.deviceFingerprint && student.deviceFingerprint !== deviceFingerprint) {
        throw new ApiError(403, 'Hardware mismatch detected. Proxy attempt flagged.');
      }

      // 2. GEOSPATIAL ANTI-SPOOFING HEURISTICS
      if (accuracy && accuracy > 50) {
        throw new ApiError(403, 'GPS accuracy too low (e.g., > 50m). Please connect to campus WiFi.');
      }

      // Option A: If frontend sends a qrToken (signed JWT from teacher), verify it.
      if (qrToken) {
        try {
            const decoded = verifyQRToken(qrToken) as any; // { classId, teacherId, timestamp }
            if (!decoded?.classId) throw new ApiError(401, 'Invalid token');
            
          const { classId, teacherId, timestamp } = decoded;
          // ensure token timeframe
          if (Date.now() - timestamp > (QR_TOKEN_TTL * 1000))
             throw new ApiError(401, 'QR expired');
    

        const usedKey = `qr:used:${qrToken}`;
    const used = await redis.get(usedKey);
    if (used) { throw new ApiError(400, 'QR token already used'); }

          const cls = await ClassModel.findById(classId).lean();
          if (!cls) throw new ApiError(404, 'Class not found');
    
          // 3. CRYPTOGRAPHIC TOTP VALIDATION (20-second rotation window)
          if (totpToken && cls.qrSession?.totpSecret) {
            const isValidToken = speakeasy.totp.verify({
              secret: cls.qrSession.totpSecret,
              encoding: 'base32',
              token: totpToken,
              step: 20, // 20-second sliding step
              window: 1 // +/- 20s buffer
            });
            if (!isValidToken) {
              throw new ApiError(401, 'Invalid or expired rotating QR TOTP token.');
            }
          }

          // check not already present
          const existing = await AttendanceModal.findOne({ classId, studentId });
          if (existing) throw new ApiError(400, 'Already marked');
    
          // optional: distance check if teacher location available on class model
          if (latitude && longitude && cls.teacher_latitude && cls.teacher_longitude) {
            const d = calculateGeodesicDistance(latitude, longitude, cls.teacher_latitude, cls.teacher_longitude);
            // Dynamic buffer zone: 12 meters strict limit
            if (d > 12) throw new ApiError(401, `Out of bounds. You are ${d.toFixed(2)} meters away from the teacher.`);
          }
    
          const attendance = await AttendanceModal.create({
            classId,
            studentId,
            teacherId,
            method: totpToken ? 'Golden_Key_QR' : 'manual',
            status: 'present',
            student_latitude: latitude,
            student_longitude: longitude,
            token: qrToken,
            verificationMethod: totpToken ? 'Golden_Key_QR' : 'None'
          });
    
         // mark token used for short period (TTL slightly longer than token TTL)
    await redis.set(usedKey as any, '1', 'PX', QR_TTL_MS * 2);

    // increment class counters (simple approach)
    cls.totalStudents = (cls.totalStudents || 0) + 1;
    await ClassModel.findByIdAndUpdate(classId, { $inc: { totalStudents: 1 } });

    
          // emit socket.io event if works
          req.app.get('io')?.emit('attendanceMarked', { studentId, classId: cls._id });
    
          return res.status(200).json(new ApiResponse(200, { attendance }, 'Attendance marked via QR'));
        } catch (err: any) {
          if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError')
             throw new ApiError(401, 'Invalid QR token');
          throw err;
        }
      } else if (totpToken && !scannedData) {
        // Option B: Standalone TOTP Token for Manual Entry
        // Find all active classes and verify the TOTP token against their secrets
        const now = new Date();
        const start = new Date(now); start.setHours(0,0,0,0);
        const end = new Date(start); end.setDate(start.getDate()+1);
        
        const activeClasses = await ClassModel.find({
            date: { $gte: start, $lt: end },
            status: 'ongoing',
            'qrSession.isActive': true,
            'qrSession.totpSecret': { $exists: true }
        });

        let matchedClass = null;

        for (const cls of activeClasses) {
            if (cls.qrSession?.totpSecret) {
                const isValidToken = speakeasy.totp.verify({
                    secret: cls.qrSession.totpSecret,
                    encoding: 'base32',
                    token: totpToken,
                    step: 20,
                    window: 1
                });
                if (isValidToken) {
                    matchedClass = cls;
                    break;
                }
            }
        }

        if (!matchedClass) {
            throw new ApiError(401, 'Invalid or expired code.');
        }

        const existing = await AttendanceModal.findOne({ classId: matchedClass._id, studentId });
        if (existing) throw new ApiError(400, 'Already marked attendance for this class');

        if (latitude && longitude && matchedClass.teacher_latitude && matchedClass.teacher_longitude) {
            const d = calculateGeodesicDistance(latitude, longitude, matchedClass.teacher_latitude, matchedClass.teacher_longitude);
            if (d > 12) throw new ApiError(401, `Out of bounds. You are ${d.toFixed(2)} meters away from the teacher.`);
        }

        const attendance = await AttendanceModal.create({
            classId: matchedClass._id,
            studentId,
            teacherId: matchedClass.teacherId,
            method: 'manual',
            status: 'present',
            student_latitude: latitude,
            student_longitude: longitude,
            token: totpToken,
            verificationMethod: 'None'
        });

        matchedClass.totalStudents = (matchedClass.totalStudents || 0) + 1;
        await matchedClass.save();

        req.app.get('io')?.emit('attendanceMarked', { studentId, classId: matchedClass._id });

        return res.status(200).json(new ApiResponse(200, { attendance }, 'Attendance marked via Code'));
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
        studentId 
      });

      if (existing) throw new ApiError(400, 'Already marked attendance for this class');
    
      // check distance
      if (latitude && longitude && cls.teacher_latitude && cls.teacher_longitude) {
        const d = geolib.getDistance({ latitude, longitude },
             { latitude: cls.teacher_latitude, longitude: cls.teacher_longitude });
        
        if (d > GEO_DISTANCE_LIMIT_METERS) 
          throw new ApiError(401, 'You are not within the allowed distance (12m)');
      }
    
      const attendance = await AttendanceModal.create({
        classId: cls._id,
        studentId,
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
         { studentId, classId: cls._id });

      return res.status(200).json(
        new ApiResponse(
        200,
         { attendance, class: cls._id, ...parsed },
          'Attendance marked successfully via QR'
        ));
} catch (error:any) {
    console.log("error in markAttendanceViaQR",error)
    throw new ApiError(500, error.message || 'Internal Server Error in markAttendanceViaQR')  
}
});

export const getSubjectWiseAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = (req as any).user._id; 
    
    const subjectWiseData = await AttendanceModal.aggregate([
      {
        $match: { studentId: new mongoose.Types.ObjectId(studentId as string) }
      },
      {
        $lookup: {
          from: 'classes', 
          localField: 'classId',
          foreignField: '_id',
          as: 'classDetails'
        }
      },
      {
        $unwind: {
          path: '$classDetails',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $group: {
          _id: "$classDetails.subject", 
          total: { $sum: 1 },
          present: {
            $sum: {
              $cond: [
                { $in: ["$status", ["present", "late"]] },
                1, 
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          subject: "$_id",
          present: 1,
          total: 1
        }
      },
      {
        $sort: { subject: 1 }
      }
    ]);
    
    return res.status(200).json(
      new ApiResponse(200, subjectWiseData, "Subject-wise attendance fetched successfully")
    );
  } catch (error: any) {
    console.error("Error fetching subject-wise attendance:", error);
    next(new ApiError(500, "Server Error in getSubjectWiseAttendance"));
  }
};

/**
 * The Sliding Window Algorithm Processor
 * Runs asynchronously to calculate attendance without blocking the main event loop.
 * Analyzes the Time Series DB for the 40/45 minute presence threshold.
 */
export const finalizeLectureAttendance = asyncHandler(async (req: Request, res: Response) => {
  const { classId } = req.params;
  const lecture = await ClassModel.findById(classId);
  if (!lecture) throw new ApiError(404, 'Class not found');

  // Use MongoDB Aggregation Framework to sum presence efficiently
  const aggregationPipeline = [
    { $match: { classId: new mongoose.Types.ObjectId(classId) } },
    { $group: { 
        _id: '$macHash', 
        heartbeatCount: { $sum: 1 } 
    }}
  ];

  const results = await TelemetryModel.aggregate(aggregationPipeline);

  // 1 heartbeat = 3 minutes. Need 36 minutes minimum. (36 / 3 = 12 heartbeats)
  const REQUIRED_HEARTBEATS = 12; 

  for (const record of results) {
    const student = await UserModal.findOne({ macHash: record._id });
    if (!student) continue;

    const checks = record.heartbeatCount;
    const minutesPresent = checks * 3;
    
    let finalStatus = 'absent';
    let verificationMethod = 'None';

    // THE NEW LOGIC:
    if (checks >= REQUIRED_HEARTBEATS) {
      // SUCCESS: Student stayed connected for at least 36 minutes. 
      // They are automatically marked present. QR scan is NOT needed.
      finalStatus = 'present';
      verificationMethod = 'Automated_WiFi';
    } else if (checks > 0 && checks < REQUIRED_HEARTBEATS) {
      // INCOMPLETE: They connected, but dropped off (e.g., left early or network issue).
      // They are flagged as 'Pending_QR'. The Golden Key activates for them.
      finalStatus = 'Pending_QR'; 
    }

    await AttendanceModal.findOneAndUpdate(
      { studentId: student._id, classId: lecture._id },
      { 
        status: finalStatus, 
        minutesPresent: minutesPresent,
        verificationMethod: verificationMethod
      },
      { upsert: true }
    );
  }

  lecture.status = 'completed';
  if (lecture.qrSession) {
      lecture.qrSession.isActive = false;
  }
  await lecture.save();

  return res.status(200).json(new ApiResponse(200, {}, 'Lecture attendance finalized via Telemetry.'));
});
