import mongoose, { Document, Schema } from 'mongoose';
import { IFees } from '../types/Fees.types.js';



const FeesSchema: Schema<IFees> = new Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student ID is required']
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required']
    },
    dueDate: {
        type: Date,
        required: [true, 'Due Date is required']
    },
    description: {
        type: String
    },
    paid: {
        type: Boolean,
        default: false
    },
    paidAt: {
        type: Date,
        default: null
    }
},{timestamps:true});

const FeesModel = (mongoose.models.Fees as mongoose.Model<IFees & Document>) ||
 mongoose.model<IFees>('Fees',FeesSchema)

 export default FeesModel
