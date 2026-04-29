import mongoose, { Document } from "mongoose";


export type ResourceType = 'Academic Material' | 'Previous year paper' | 'Video' | 'Other';

export interface IResource extends Document {
  title: string;
  description?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  resourceType: ResourceType;
  uploadedBy?: mongoose.Types.ObjectId | { _id: string; fullname?: string };
  publicId?: string; // cloudinary public id
  createdAt?: Date;
  updatedAt?: Date;
}