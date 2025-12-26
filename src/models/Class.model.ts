import mongoose, {Schema, Document} from "mongoose";
import {IClass} from "../types/Class.types.js";



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
    date: {
        type: Date,
         required: [true,"Date is required"]
        },
    status: {
        type: String,
         enum: ['cancelled', 'ongoing', 'completed'],
          default: 'ongoing'
        },
    totalStudents: {
        type: Number,
         default: 0
        }
}, {
    timestamps: true
})

const ClassModel = (mongoose.models.Class as mongoose.Model<IClass & Document>) ||
 mongoose.model<IClass>('Class',ClassSchema)

 export default ClassModel
