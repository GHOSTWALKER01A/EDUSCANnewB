import mongoose, {Schema, Document} from "mongoose";
import {IClass} from "../types/Class.types.js";
import { IQRSession } from "../types/Class.types.js";


const QRSessionSchema = new Schema<IQRSession>({
  sessionId: String,
  startTime: Date,
  endTime: Date,
  isActive: { type: Boolean, default: false },
  lastTokenGenerated: Date,
  totpSecret: String,
}, { _id: false });


export const ClassSchema: Schema<IClass> = new Schema({
    name: {
        type: String,
         required: [true,"Name is required"]
        },
    subject: {
        type: String,
         required: [true,"Subject is required"]
        },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
         ref: 'User'
        },
    teacherName: {
        type: String
    },
    teacher_latitude: {
        type: Number
    },
    teacher_longitude: {
        type: Number
    },
    branch: {
        type: String
    },
    date: {
        type: Date,
         required: [true,"Date is required"]
        },
    time: {
         type: String, 
         required: true 
        },
    room: String,
    status: {
        type: String,
         enum: ['cancelled', 'ongoing', 'completed'],
          default: 'ongoing'
        },
    classStatus: {
         type: String,
          enum: ['scheduled', 'rescheduled', 'cancelled'],
           default: 'scheduled' 
        },
    totalStudents: {
        type: Number,
         default: 0
        },
    studentsPresent: {
         type: Number,
          default: 0
        },
    semester: {
        type: String
    },
    isConfirmed: {
        type: Boolean,
        default: false
    },
    qrSession: { 
        type: QRSessionSchema,
         default: {} 
        }
}, {
    timestamps: true
})

const ClassModel = (mongoose.models.Class as mongoose.Model<IClass & Document>) ||
 mongoose.model<IClass>('Class',ClassSchema)

 export default ClassModel
