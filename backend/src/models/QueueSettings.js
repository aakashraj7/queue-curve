const mongoose = require('mongoose');

const QueueSettingsSchema = new mongoose.Schema({
  averageConsultationTime: {
    type: Number,
    required: true,
    default: 15
  }
});

module.exports = mongoose.model('QueueSettings', QueueSettingsSchema);
