const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  tokenNumber: {
    type: Number,
    required: true
  },
  patientName: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['waiting', 'serving', 'completed', 'skipped'],
    default: 'waiting'
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
