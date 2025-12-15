import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  studentId: { type: String, required: true },
  className: { type: String, required: true },
  checkInTime: { type: Date, default: Date.now },
  status: { type: String, enum: ['Present', 'Late'], default: 'Present' },
  location: {
    lat: Number,
    lon: Number
  }
});

export default mongoose.model('AttendanceLog', AttendanceSchema);