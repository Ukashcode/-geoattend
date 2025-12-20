import mongoose from 'mongoose';

const StudentDeviceSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  deviceId: { type: String, required: true },
  firstUsed: { type: Date, default: Date.now }
});

export default mongoose.model('StudentDevice', StudentDeviceSchema);