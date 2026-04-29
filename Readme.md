/**
 * Geolocation-Based Automated Attendance Tracking System
 * Enterprise Backend Application (Node.js / Express / TypeScript / MongoDB)
 * * Prerequisites:
 * npm install express mongoose speakeasy crypto-js cors helmet node-cron
 * npm install -D typescript @types/express @types/node @types/speakeasy
 */

import express, { Request, Response, NextFunction } from 'express';
import mongoose, { Document, Schema } from 'mongoose';
import speakeasy from 'speakeasy';
import crypto from 'crypto';

// ==========================================
// 1. CONFIGURATION & ENVIRONMENT
// ==========================================
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/attendance_system';
const APP_SECRET = process.env.APP_SECRET || 'super_secret_enterprise_key_change_in_prod';

// ==========================================
// 2. MONGODB SCHEMAS (Optimized for IoT)
// ==========================================

// A. Student Schema (Normalized)
interface IStudent extends Document {
  studentId: string;
  name: string;
  hashedMac: string;
  deviceFingerprint: string; // Used for anti-spoofing
  salt: string;
}

const StudentSchema = new Schema<IStudent>({
  studentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  hashedMac: { type: String, required: true, index: true },
  deviceFingerprint: { type: String, required: true },
  salt: { type: String, required: true }
});
const Student = mongoose.model<IStudent>('Student', StudentSchema);

// B. Lecture Session Schema
interface ILecture extends Document {
  courseCode: string;
  instructorId: string;
  startTime: Date;
  endTime: Date;
  location: { lat: number; lng: number };
  totpSecret: string; // The base32 secret for the 20s rotating QR code
  isActive: boolean;
}

const LectureSchema = new Schema<ILecture>({
  courseCode: { type: String, required: true },
  instructorId: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  totpSecret: { type: String, required: true },
  isActive: { type: Boolean, default: true }
});
const Lecture = mongoose.model<ILecture>('Lecture', LectureSchema);

// C. Telemetry Time Series Schema (MongoDB 5.0+)
// Handles the high-frequency 3-minute heartbeat data efficiently
interface ITelemetry extends Document {
  timestamp: Date;
  macHash: string;
  lectureId: mongoose.Types.ObjectId;
}

const TelemetrySchema = new Schema<ITelemetry>({
  timestamp: { type: Date, required: true },
  macHash: { type: String, required: true },
  lectureId: { type: Schema.Types.ObjectId, ref: 'Lecture', required: true }
}, {
  timeseries: {
    timeField: 'timestamp',
    metaField: 'lectureId',
    granularity: 'minutes'
  },
  expireAfterSeconds: 172800 // Auto-delete raw telemetry after 48 hours (Privacy by Design)
});
const Telemetry = mongoose.model<ITelemetry>('Telemetry', TelemetrySchema);

// D. Final Attendance Ledger Schema
interface IAttendance extends Document {
  studentId: mongoose.Types.ObjectId;
  lectureId: mongoose.Types.ObjectId;
  status: 'Present' | 'Absent' | 'Incomplete';
  minutesPresent: number;
  verificationMethod: 'Automated_WiFi' | 'Golden_Key_QR' | 'None';
}

const AttendanceSchema = new Schema<IAttendance>({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  lectureId: { type: Schema.Types.ObjectId, ref: 'Lecture', required: true },
  status: { type: String, enum: ['Present', 'Absent', 'Incomplete'], default: 'Absent' },
  minutesPresent: { type: Number, default: 0 },
  verificationMethod: { type: String, enum: ['Automated_WiFi', 'Golden_Key_QR', 'None'], default: 'None' }
});
const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);


// ==========================================
// 3. UTILITY & CRYPTOGRAPHIC FUNCTIONS
// ==========================================

/**
 * Hashes a plaintext MAC address with a user-specific salt.
 * Ensures strict compliance with data privacy regulations (GDPR/DPDP).
 */
const hashMacAddress = (mac: string, salt: string): string => {
  return crypto.createHmac('sha256', salt).update(mac.toLowerCase()).digest('hex');
};

/**
 * Calculates the Great-Circle distance between two coordinates in meters.
 * Uses the Haversine formula to account for Earth's spherical shape.
 */
const calculateGeodesicDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
            
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};


// ==========================================
// 4. EXPRESS APPLICATION GATEWAY
// ==========================================
const app = express();
app.use(express.json());

// --- A. Student Enrollment Endpoint ---
app.post('/api/enroll', async (req: Request, res: Response) => {
  try {
    const { studentId, name, plainTextMac, deviceFingerprint } = req.body;
    
    // Generate a unique salt for cryptographic anonymization
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedMac = hashMacAddress(plainTextMac, salt);

    const student = new Student({
      studentId, name, hashedMac, deviceFingerprint, salt
    });

    await student.save();
    res.status(201).json({ message: 'Device successfully enrolled & anonymized.' });
  } catch (error) {
    res.status(500).json({ error: 'Enrollment failed.' });
  }
});

// --- B. Lecture Initiation (Instructor) ---
app.post('/api/lecture/start', async (req: Request, res: Response) => {
  try {
    const { courseCode, instructorId, lat, lng } = req.body;
    
    // Generate a secure Base32 TOTP secret for the Golden Key mechanism
    const secret = speakeasy.generateSecret({ length: 20 });
    
    const lecture = new Lecture({
      courseCode,
      instructorId,
      startTime: new Date(),
      endTime: new Date(Date.now() + 45 * 60000), // 45 minutes duration
      location: { lat, lng },
      totpSecret: secret.base32
    });

    await lecture.save();
    res.status(201).json({ 
      message: 'Lecture started.', 
      lectureId: lecture._id,
      totpSecret: secret.base32 // Frontend uses this to generate the rotating QR
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start lecture.' });
  }
});

// --- C. Router Edge Telemetry Webhook (Push Model) ---
// The lecture hall router pushes this payload every 3 minutes
app.post('/api/telemetry/webhook', async (req: Request, res: Response) => {
  try {
    const { lectureId, activeMacs } = req.body; // activeMacs is an array of plaintext MACs from the router

    // We must find students currently enrolled to salt and hash the incoming MACs properly.
    // In production, an in-memory Redis cache maps plaintext MACs to Hashed MACs to save DB calls.
    const students = await Student.find({}); 
    const telemetryDocs = [];

    for (const mac of activeMacs) {
      // Find matching student
      const student = students.find(s => hashMacAddress(mac, s.salt) === s.hashedMac);
      if (student) {
        telemetryDocs.push({
          timestamp: new Date(),
          macHash: student.hashedMac,
          lectureId
        });
      }
    }

    // High-velocity bulk insert into Time Series collection
    if (telemetryDocs.length > 0) {
      await Telemetry.insertMany(telemetryDocs);
    }

    res.status(200).json({ message: 'Telemetry processed successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Telemetry ingestion failed.' });
  }
});

// --- D. Golden Key (QR Code) Validation Endpoint ---
app.post('/api/attendance/qr-verify', async (req: Request, res: Response): Promise<any> => {
  try {
    const { studentId, lectureId, totpToken, lat, lng, accuracy, deviceFingerprint } = req.body;

    const student = await Student.findOne({ studentId });
    const lecture = await Lecture.findById(lectureId);

    if (!student || !lecture) return res.status(404).json({ error: 'Data not found' });
    if (!lecture.isActive) return res.status(400).json({ error: 'Lecture is no longer active.' });

    // 1. DEVICE FINGERPRINT ANTI-PROXY CHECK
    // If the browser fingerprint doesn't match the one saved at enrollment, it's a proxy attempt
    if (student.deviceFingerprint !== deviceFingerprint) {
      return res.status(403).json({ error: 'Hardware mismatch detected. Proxy attempt flagged.' });
    }

    // 2. CRYPTOGRAPHIC TOTP VALIDATION (20-second rotation window)
    const isValidToken = speakeasy.totp.verify({
      secret: lecture.totpSecret,
      encoding: 'base32',
      token: totpToken,
      step: 20, // 20-second step as requested
      window: 1 // Allows +/- 20 seconds buffer for network latency/clock drift
    });

    if (!isValidToken) {
      return res.status(401).json({ error: 'Invalid or expired QR token.' });
    }

    // 3. GEOSPATIAL ANTI-SPOOFING HEURISTICS
    // Reject completely bogus GPS accuracies (e.g., cell tower triangulation > 50m)
    if (accuracy > 50) {
      return res.status(403).json({ error: 'GPS accuracy too low. Please connect to campus WiFi.' });
    }

    const distance = calculateGeodesicDistance(lat, lng, lecture.location.lat, lecture.location.lng);
    
    // Dynamic buffer zone: 10 meters strict limit
    if (distance > 10) {
      return res.status(403).json({ 
        error: `Out of bounds. You are ${distance.toFixed(2)} meters away from the lecture hall.` 
      });
    }

    // All checks passed -> Mark as present via Golden Key
    await Attendance.findOneAndUpdate(
      { studentId: student._id, lectureId: lecture._id },
      { status: 'Present', verificationMethod: 'Golden_Key_QR' },
      { upsert: true }
    );

    res.status(200).json({ message: 'Attendance successfully cryptographically verified.' });
  } catch (error) {
    res.status(500).json({ error: 'Validation process failed.' });
  }
});

// ==========================================
// 5. BACKGROUND WORKERS / ALGORITHMS
// ==========================================

/**
 * The Sliding Window Algorithm Processor
 * Runs asynchronously to calculate attendance without blocking the main event loop.
 * Analyzes the Time Series DB for the 40/45 minute presence threshold.
 */
const finalizeLectureAttendance = async (lectureId: string) => {
  const lecture = await Lecture.findById(lectureId);
  if (!lecture) return;

  // Use MongoDB Aggregation Framework to sum presence efficiently
  const aggregationPipeline = [
    { $match: { lectureId: new mongoose.Types.ObjectId(lectureId) } },
    { $group: { 
        _id: '$macHash', 
        heartbeatCount: { $sum: 1 } 
    }}
  ];

  const results = await Telemetry.aggregate(aggregationPipeline);

  // 1 heartbeat = 3 minutes. Need 40 minutes minimum. (40 / 3 ≈ 13.33 -> 13 heartbeats)
  const REQUIRED_HEARTBEATS = 13; 

  for (const record of results) {
    const student = await Student.findOne({ hashedMac: record._id });
    if (!student) continue;

    const minutesPresent = record.heartbeatCount * 3;
    let finalStatus = 'Absent';

    if (record.heartbeatCount >= REQUIRED_HEARTBEATS) {
      finalStatus = 'Present';
    } else if (record.heartbeatCount > 0) {
      // Degrade gracefully to Incomplete, requiring Golden Key QR scan
      finalStatus = 'Incomplete';
    }

    await Attendance.findOneAndUpdate(
      { studentId: student._id, lectureId: lecture._id },
      { 
        status: finalStatus, 
        minutesPresent: minutesPresent,
        verificationMethod: finalStatus === 'Present' ? 'Automated_WiFi' : 'None'
      },
      { upsert: true }
    );
  }

  // Mark lecture as closed
  lecture.isActive = false;
  await lecture.save();
};

// ==========================================
// 6. SERVER INITIALIZATION
// ==========================================
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB Time Series Cluster');
    app.listen(PORT, () => {
      console.log(`Enterprise Attendance Gateway listening on port ${PORT}`);
    });
  })
  .catch(err => console.error('Database connection failed:', err));