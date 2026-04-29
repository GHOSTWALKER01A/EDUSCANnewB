import mongoose, { Document, Schema } from 'mongoose';
import { IAttendance } from '../types/Attendance.type.js';

const AttendanceSchema: Schema<IAttendance> = new Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class ID is required']
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required']
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  method: {
    type: String,
    enum: ['auto', 'manual', 'qr', 'Automated_WiFi', 'Golden_Key_QR', 'None'],
    default: 'auto'
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused', 'incomplete'],
    default: 'absent'
  },
  minutesPresent: {
    type: Number,
    default: 0
  },
  verificationMethod: {
    type: String,
    enum: ['Automated_WiFi', 'Golden_Key_QR', 'None'],
    default: 'None'
  },
  student_latitude: {
    type: Number
  },
  student_longitude: {
    type: Number
  },
  macHash: {
    type: String
  },
  token: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isValid: {
     type: Boolean,
     default: true
    }
},{timestamps:true});

const AttendanceModel = (mongoose.models.Attendance as mongoose.Model<IAttendance & Document>) ||
 mongoose.model<IAttendance>('Attendance',AttendanceSchema)

 export default AttendanceModel