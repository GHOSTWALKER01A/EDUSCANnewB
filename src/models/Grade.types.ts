import mongoose, {Schema, Document } from "mongoose";
import { IGrade } from "../types/Grade.types.js";

const GradeSchema: Schema<IGrade> = new Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required']
  },
  semester: {
    type: Number,
    required: [true, 'Semester is required']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required']
  },
  midSemester: {
    type: Number,
    required: [true, 'Mid Semester is required']
  },
  practicals: {
    type: Number,
    required: [true, 'Practicals is required']
  },
  semesterExam: {
    type: Number,
    required: [true, 'Semester Exam is required']
  },
  finalGrade: {
    type: Number
  }
},{timestamps:true});



const GradeModel = (mongoose.models.Grade as mongoose.Model<IGrade & Document>) ||
 mongoose.model<IGrade>('Grade',GradeSchema)

 export default GradeModel
