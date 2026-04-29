
import mongoose, { Document, Schema } from "mongoose"

export type MediaType = 'Image' | 'Video' | 'none';

export interface IEvent extends Document {
  teacherId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  category?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
  location?: string;
  mediaUrl?: string;
  mediaType?: MediaType | string;
  mediaPublicId?: string;
  mediaSize?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: Schema.Types.ObjectId
}





