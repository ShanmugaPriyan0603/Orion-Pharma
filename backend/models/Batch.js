const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  batchId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  medicineName: {
    type: String,
    required: true
  },
  origin: {
    type: String,
    required: true
  },
  originCoordinates: {
    lat: Number,
    lng: Number
  },
  destination: {
    type: String,
    required: true
  },
  destinationCoordinates: {
    lat: Number,
    lng: Number
  },
  quantityInStock: {
    type: Number,
    default: null,
    min: 0
  },
  currentStage: {
    type: String,
    enum: ['manufacturer', 'warehouse', 'distributor', 'pharmacy'],
    default: 'manufacturer'
  },
  temperature: {
    type: Number,
    required: true,
    default: 5
  },
  targetTempMin: {
    type: Number,
    default: 2
  },
  targetTempMax: {
    type: Number,
    default: 8
  },
  trustScore: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['in-transit', 'delivered', 'compromised'],
    default: 'in-transit'
  },
  blockchainHash: {
    type: String,
    default: null
  },
  stages: [{
    name: String,
    location: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    temperature: Number,
    coordinates: {
      lat: Number,
      lng: Number
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

batchSchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Update status based on trust score
  if (this.trustScore < 50) {
    this.status = 'compromised';
  } else if (this.currentStage === 'pharmacy') {
    this.status = 'delivered';
  }

  next();
});

module.exports = mongoose.model('Batch', batchSchema);
