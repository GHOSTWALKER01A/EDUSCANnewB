import mongoose, { Schema } from 'mongoose';
import { ITelemetry } from '../types/Telemetry.type.js';

const TelemetrySchema: Schema<ITelemetry> = new Schema({
  timestamp: {
     type: Date,
      required: true
     },
  macHash: {
     type: String,
      required: true 
    },
  classId: {
     type: Schema.Types.ObjectId,
      ref: 'Class',
       required: true 
    }
}, {
  timeseries: {
    timeField: 'timestamp',
    metaField: 'classId',
    granularity: 'minutes'
  },
  expireAfterSeconds: 172800 // Auto-delete raw telemetry after 48 hours
});

const TelemetryModel = (mongoose.models.Telemetry as mongoose.Model<ITelemetry>) || 
  mongoose.model<ITelemetry>('Telemetry', TelemetrySchema);

export default TelemetryModel;
