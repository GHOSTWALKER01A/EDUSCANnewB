import mongoose, { Document } from "mongoose";


export interface IDoubt extends Document {
  studentId: mongoose.Types.ObjectId;
  teacherId: mongoose.Types.ObjectId;
  subject: string;
  description: string;
  attachments: { url: string; fileName: string; fileType: string; publicId: string }[];
  status: 'open' | 'answered' | 'closed';
  replies: {
    by: { _id: mongoose.Types.ObjectId; fullname: string; role: string };
    message: string;
    attachments: { url: string; fileName: string; fileType: string; publicId: string }[];
  }[];
}