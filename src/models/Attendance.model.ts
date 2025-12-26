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
    enum: ['auto', 'manual'],
    default: 'manual'
  },
  status: {
    type: String,
    enum: ['present', 'absent'],
    default: 'absent'
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
  }
},{timestamps:true});

const AttendanceModel = (mongoose.models.Attendance as mongoose.Model<IAttendance & Document>) ||
 mongoose.model<IAttendance>('Attendance',AttendanceSchema)

 export default AttendanceModel