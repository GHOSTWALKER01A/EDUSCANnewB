import mongoose, { Document, Schema } from "mongoose";
import { IEvent } from "../types/Event.types.js";


const EventSchema = new Schema<IEvent>({
  teacherId: {
     type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
       required: true
      },
  title: {
     type: String,
      required: true,
      trim: true,
      maxLength: 200 
      },
  description: {
     type: String,
     trim: true,
     maxLength: 2000
    },
  startDate: {
     type: Date,
      required: true
     },
   endDate: {
     type: Date,
      required: true
     },
   startTime: {
     type: String,
      
     },
   endTime: {
     type: String,
      
     },
  location: {
     type: String 
    },
  category: {
     type: String,
      default: 'General'
     },
   mediaType: {
     type: String,
      enum: ['image', 'video', 'none'],
      default: 'none'
      },
   mediaUrl: {
     type: String,
      default: null
     },
   mediaPublicId: {
     type: String,
      default: null
     },
   mediaSize: {
     type: Number,
      default: null
     },
  createdBy: {
     type: Schema.Types.ObjectId,
      ref: 'User',
       required: true 
      },
}, { timestamps: true })


const EventModel = (mongoose.models.Event as mongoose.Model<IEvent & Document>) ||
 mongoose.model<IEvent>('Event',EventSchema)

 export default EventModel