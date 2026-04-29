// src/models/Doubt.ts
import mongoose, { Schema, Document } from 'mongoose';
import { IDoubt } from '../types/doubt.types.js';


const AttachmentSchema: Schema = new Schema({
  url: { type: String, required: true },
  fileName: { type: String },
  fileType: { type: String },
  publicId: { type: String }
}, { _id: false });

const ReplySchema: Schema = new Schema({
  by: { _id: { type: Schema.Types.ObjectId, ref: 'User' }, fullname: String, role: String },
  message: { type: String, required: true },
  attachments: [AttachmentSchema]
}, { timestamps: true });

const DoubtSchema: Schema<IDoubt> = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  teacherId: { type: Schema.Types.ObjectId, ref: 'User' },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  attachments: [AttachmentSchema],
  status: { type: String, enum: ['open', 'answered', 'closed'], default: 'open' },
  replies: [ReplySchema]
}, { timestamps: true });

const DoubtModal = (mongoose.models.Doubt as mongoose.Model<IDoubt & Document>) ||
 mongoose.model<IDoubt>('Doubt',DoubtSchema)

 export default DoubtModal
