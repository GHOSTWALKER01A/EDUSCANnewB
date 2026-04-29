import mongoose, { Document, Schema } from 'mongoose';

export interface ISchedule extends Document {
  teacherId: mongoose.Types.ObjectId | Record<string, any>;
  classGroup: string;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  time: string;
  subject: string;
  type: 'academic' | 'arts' | 'pe' | 'extracurricular' | 'admin';
  room: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'rescheduled';
  note?: string;
  rescheduledTo?: string;
  isRecess: boolean;
}

const scheduleSchema: Schema<ISchedule> = new Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  classGroup: {
    type: String,
    required: true,
    index: true 
  },
  day: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    required: true
  },
  time: {
    type: String, 
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['academic', 'arts', 'pe', 'extracurricular', 'admin'],
    default: 'academic'
  },
  room: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled', 'rescheduled'],
    default: 'scheduled'
  },
  note: {
    type: String
  },
  rescheduledTo: {
    type: String 
  },
  isRecess: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Compound index to prevent double booking a teacher or a class
scheduleSchema.index({ teacherId: 1, day: 1, time: 1 }, { unique: true });
scheduleSchema.index({ classGroup: 1, day: 1, time: 1 }, { unique: true });

const ScheduleModel = (mongoose.models.Schedule as mongoose.Model<ISchedule & Document>) || mongoose.model<ISchedule>('Schedule', scheduleSchema);

export default ScheduleModel;
