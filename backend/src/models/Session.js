const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  averageConsultationTime: {
    type: Number,
    required: true,
    default: 15
  },
  sessionStatus: {
    type: String,
    enum: ['open', 'lunch-break', 'closed'],
    default: 'open'
  },
  mostSignificantMessage: {
    type: String,
    default: ''
  },
  leastSignificantMessage: {
    type: String,
    default: ''
  },
  isInitialized: {
    type: Boolean,
    default: false
  },
  doctors: [
    {
      code: { type: String, required: true },
      name: { type: String, required: true },
      availability: {
        type: String,
        enum: ['available', 'lunch-break', 'not-available'],
        default: 'available'
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Session', SessionSchema);
