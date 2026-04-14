const express = require('express');
const router = express.Router();
const {
  simulateTemperature,
  simulateLocation,
  simulateDelayEvent,
  getPrediction,
  getTrustScore,
  simulateSpike
} = require('../controllers/simulationController');

// POST /api/simulate/temperature - Simulate temperature change
router.post('/temperature', simulateTemperature);

// POST /api/simulate/location - Move to next stage
router.post('/location', simulateLocation);

// POST /api/simulate/delay - Simulate delay
router.post('/delay', simulateDelayEvent);

// POST /api/simulate/spike - Quick temperature spike
router.post('/spike', simulateSpike);

// GET /api/simulate/predict/:batchId - Get prediction
router.get('/predict/:batchId', getPrediction);

// GET /api/simulate/trust/:batchId - Get trust score
router.get('/trust/:batchId', getTrustScore);

module.exports = router;
