import mongoose, { Document } from "mongoose";

export interface ITelemetry extends Document {
  timestamp: Date;
  macHash: string;
  classId: mongoose.Types.ObjectId;
}
