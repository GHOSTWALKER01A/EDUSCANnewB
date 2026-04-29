import mongoose, { Document } from 'mongoose';


export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'incomplete';

export interface IAttendance extends Document {
  classId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  teacherId?: mongoose.Types.ObjectId;
  method: 'auto' | 'qr' | 'manual' | 'Automated_WiFi' | 'Golden_Key_QR' | 'None';
  status: AttendanceStatus;
  minutesPresent?: number;
  verificationMethod?: 'Automated_WiFi' | 'Golden_Key_QR' | 'None';
  student_latitude?: number;
  student_longitude?: number;
  macHash?: string;
  token?: string;
  createdAt: Date;
  updatedAt: Date;
  isValid?: boolean;
}