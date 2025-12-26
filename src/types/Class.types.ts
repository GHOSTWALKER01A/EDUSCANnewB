import mongoose, { Document } from "mongoose"


export interface IClass extends Document {
    name: string
    subject: string
    teacherId?: mongoose.Types.ObjectId
    teacherName?: string
    teacher_latitude?: number
    teacher_longitude?: number
    date: Date
    status: 'cancelled' | 'ongoing' | 'completed'
    totalStudents: number
}