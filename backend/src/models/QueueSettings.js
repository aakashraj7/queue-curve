const mongoose = require('mongoose');

const QueueSettingsSchema = new mongoose.Schema({
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
  isInitialized: {
    type: Boolean,
    default: false
  },
  doctors: [
    {
      code: { type: String, required: true },
      name: { type: String, required: true }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('QueueSettings', QueueSettingsSchema);
