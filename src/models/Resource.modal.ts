import mongoose, { Document } from "mongoose";
import { IResource } from "../types/Resource.types.js";

const resourceSchema = new mongoose.Schema<IResource>({
    title: {
        type: String,
        required:[ true, "Title is required"],
        trim: true,
        index: 'text'

    },
    description: {
        type: String,
        // required:[ true, "Description is required"]
    },
    fileUrl: {
        type: String,
        // required:[ true, "File URL is required"]
    },
    fileType: {
        type: String,
        // required:[ true, "File Type is required"]
    },
    fileSize: {
        type: Number,
        // required:[ true, "File Size is required"]
    },
    resourceType: {
        type: String,
        enum: ['Academic Material', 'Previous year paper', 'Video', 'Other'],
        required:[ true, "Resource Type is required"],
        default: 'Academic Material'
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    publicId: {
        type: String,

    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {timestamps: true});


const ResourceModel = (mongoose.models.Resource as mongoose.Model<IResource & Document>) ||
 mongoose.model<IResource>('Resource',resourceSchema)

 export default ResourceModel