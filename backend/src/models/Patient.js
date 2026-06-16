const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true
  },
  tokenNumber: {
    type: Number,
    required: true
  },
  patientName: {
    type: String,
    required: true,
    trim: true
  },
  assignedDoctors: {
    type: [String],
    default: ['all']
  },
  status: {
    type: String,
    enum: ['waiting', 'calling', 'serving', 'completed', 'skipped'],
    default: 'waiting'
  },
  calledBy: {
    type: String
  },
  estimatedWaitTime: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  calledAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
});

module.exports = mongoose.model('Patient', PatientSchema);
