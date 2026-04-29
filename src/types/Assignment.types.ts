import mongoose, { Document } from "mongoose";

export interface IAssignment extends Document {
  userId: mongoose.Types.ObjectId;
  subject: string;
  description?: string;
  fileUrl?: string;        // hosted url
  filePreview?: string;    // optional data-URL for quick preview
  fileType?: string;
  fileName?: string;
  createdAt: Date;
  updatedAt: Date;
}
