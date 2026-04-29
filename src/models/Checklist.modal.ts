// src/models/Checklist.ts
import mongoose, { Schema, Document } from 'mongoose'

export interface IChecklist extends Document {
  studentId: mongoose.Types.ObjectId
  items: {
      id: string
      text: string
      done: boolean
  }[]
}

const ChecklistSchema: Schema = new Schema<IChecklist>({
  studentId: {
     type: Schema.Types.ObjectId,
     ref: 'User',
     required: true,
     unique: true 
    },
  items: { 
    type: [{
      id: String,
      text: String,
      done: Boolean
    }],
     default: []
    }
}, { timestamps: true })

const ChecklistModel = (mongoose.models.Checklist as mongoose.Model<IChecklist & Document>) ||
 mongoose.model<IChecklist>('Checklist',ChecklistSchema)

 export default ChecklistModel
