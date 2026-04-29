import mongoose, { Document } from "mongoose"


export interface IClass extends Document {
    name: string
    subject: string
    branch?: string
    teacherId?: mongoose.Types.ObjectId
    teacherName?: string
    teacher_latitude?: number
    teacher_longitude?: number
    date: Date
    time: string; // e.g. "9:00 AM - 9:45 AM"
    room?: string;
    studentsPresent?: number;
    status: 'cancelled' | 'ongoing' | 'completed'
    classStatus: 'scheduled' | 'rescheduled' | 'cancelled'
    totalStudents?: number
    qrSession?: IQRSession;
    semester?: string;
    isConfirmed?: boolean;
}



export interface IQRSession {
  sessionId?: string;
  startTime?: Date;
  endTime?: Date;
  isActive?: boolean;
  lastTokenGenerated?: Date;
  totpSecret?: string;
}


