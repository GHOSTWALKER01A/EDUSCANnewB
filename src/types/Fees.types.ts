import mongoose, { Document } from "mongoose";

export interface IFees extends Document{
    studentId: mongoose.Types.ObjectId,
    amount: number,
    dueDate?: Date,
    description?: string,
    paid?: boolean,
    paidAt?: Date | null
}