import mongoose, { Document, Schema } from 'mongoose';

// Sub-document: a single period assigned to a specific day in a time slot
export interface ISubjectEntry {
  _id?: mongoose.Types.ObjectId;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
  subject: string;
  type: 'academic' | 'arts' | 'pe' | 'extracurricular' | 'admin';
  room: string;
  teacher: string; // Teacher name string (admin convenience, not a ref)
  status?: 'scheduled' | 'cancelled' | 'rescheduled';
  note?: string;
  rescheduledTo?: string;
}

// Sub-document: a single time slot row in the timetable
export interface ITimeSlot {
  time: string;        // e.g. "09:00 - 09:45"
  isRecess: boolean;
  subjects: ISubjectEntry[];
}

// Root timetable document
export interface ITimetable extends Document {
  branch: string;      // e.g. "CSE"
  semester: string;    // e.g. "3rd"
  slots: ITimeSlot[];
  createdAt?: Date;
  updatedAt?: Date;
}

const SubjectEntrySchema = new Schema<ISubjectEntry>({
  day: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    required: true,
  },
  subject: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['academic', 'arts', 'pe', 'extracurricular', 'admin'],
    default: 'academic',
  },
  room: { type: String, required: true, trim: true },
  teacher: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['scheduled', 'cancelled', 'rescheduled'],
    default: 'scheduled',
  },
  note: { type: String },
  rescheduledTo: { type: String },
}, { _id: true });

const TimeSlotSchema = new Schema<ITimeSlot>({
  time: { type: String, required: true, trim: true },
  isRecess: { type: Boolean, default: false },
  subjects: { type: [SubjectEntrySchema], default: [] },
}, { _id: false });

const TimetableSchema = new Schema<ITimetable>({
  branch: { type: String, required: true, trim: true, uppercase: true, index: true },
  semester: { type: String, required: true, trim: true },
  slots: { type: [TimeSlotSchema], default: [] },
}, { timestamps: true });

// Compound unique index – one timetable per branch+semester
TimetableSchema.index({ branch: 1, semester: 1 }, { unique: true });

const TimetableModel =
  (mongoose.models.Timetable as mongoose.Model<ITimetable & Document>) ||
  mongoose.model<ITimetable>('Timetable', TimetableSchema);

export default TimetableModel;
