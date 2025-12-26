import mongoose, { Document } from 'mongoose';

export interface IAttendance extends Document {
  classId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  teacherId?: mongoose.Types.ObjectId;
  method: 'auto' | 'manual';
  status: 'present' | 'absent';
  student_latitude?: number;
  student_longitude?: number;
  macHash?: string;
  token?: string;
  createdAt: Date;
}