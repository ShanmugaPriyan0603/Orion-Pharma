const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  batchId: {
    type: String,
    required: true,
    ref: 'Batch'
  },
  type: {
    type: String,
    enum: ['temperature', 'location', 'trust_score', 'alert'],
    required: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  previousValue: {
    type: mongoose.Schema.Types.Mixed
  },
  blockchainHash: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

logSchema.index({ batchId: 1, timestamp: -1 });

module.exports = mongoose.model('Log', logSchema);
