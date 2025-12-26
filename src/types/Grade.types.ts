import mongoose, { Document } from "mongoose";

export interface IGrade extends Document {
  studentId: mongoose.Types.ObjectId;
  semester: number;
  subject: string;
  midSemester: number;
  practicals: number;
  semesterExam: number;
  finalGrade?: number;
}
