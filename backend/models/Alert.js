const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  batchId: {
    type: String,
    required: true,
    ref: 'Batch'
  },
  type: {
    type: String,
    enum: ['temperature_breach', 'predicted_breach', 'delay', 'route_deviation', 'trust_critical'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

alertSchema.index({ batchId: 1, createdAt: -1 });
alertSchema.index({ resolved: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
