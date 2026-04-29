import mongoose, {Schema, Document } from "mongoose";
import { IAssignment } from "../types/Assignment.types.js";

const AssignmentSchema: Schema<IAssignment> = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required:[ true, 'Subject is required']
  },
  description: {
    type: String
  },
  fileUrl: {
    type: String
  },
  filePreview: {
    type: String
  },
  fileType: {
    type: String
  },
  fileName: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const AssignmentModel = (mongoose.models.Assignment as mongoose.Model<IAssignment & Document>) ||
 mongoose.model<IAssignment>('Assignment',AssignmentSchema)

 export default AssignmentModel