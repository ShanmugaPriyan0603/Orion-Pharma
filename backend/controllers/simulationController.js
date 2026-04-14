const {
  updateTemperature,
  moveToNextStage,
  simulateDelay,
  generateTemperature
} = require('../services/simulationService');
const { getPredictionReport } = require('../services/predictionService');
const { getScoreStatus } = require('../services/trustScoreService');

/**
 * Simulation Controller
 * Handles manual simulation triggers for demo purposes
 */

/**
 * Simulate temperature change
 * POST /api/simulate/temperature
 */
const simulateTemperature = async (req, res) => {
  try {
    const { batchId, breach, spike, value } = req.body;

    if (!batchId) {
      return res.status(400).json({
        success: false,
        error: 'batchId is required'
      });
    }

    const options = {
      breach: breach === true,
      spike: spike === true
    };

    // Allow manual temperature value
    if (typeof value === 'number') {
      options.manualValue = value;
    }

    const result = await updateTemperature(batchId, options);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    res.json({
      success: true,
      message: breach || spike
        ? `Temperature breach simulated: ${result.temperature}°C`
        : `Temperature updated: ${result.temperature}°C`,
      data: result
    });
  } catch (error) {
    console.error('Simulate temperature error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Move batch to next stage
 * POST /api/simulate/location
 */
const simulateLocation = async (req, res) => {
  try {
    const { batchId } = req.body;

    if (!batchId) {
      return res.status(400).json({
        success: false,
        error: 'batchId is required'
      });
    }

    const result = await moveToNextStage(batchId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    res.json({
      success: true,
      message: result.message || `Moved to ${result.currentStage}`,
      data: result
    });
  } catch (error) {
    console.error('Simulate location error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Simulate delay
 * POST /api/simulate/delay
 */
const simulateDelayEvent = async (req, res) => {
  try {
    const { batchId } = req.body;

    if (!batchId) {
      return res.status(400).json({
        success: false,
        error: 'batchId is required'
      });
    }

    const result = await simulateDelay(batchId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    res.json({
      success: true,
      message: 'Delay event simulated',
      data: result
    });
  } catch (error) {
    console.error('Simulate delay error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get prediction for batch
 * GET /api/simulate/predict/:batchId
 */
const getPrediction = async (req, res) => {
  try {
    const { batchId } = req.params;

    const prediction = await getPredictionReport(batchId);

    if (!prediction) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    console.error('Get prediction error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get trust score status
 * GET /api/simulate/trust/:batchId
 */
const getTrustScore = async (req, res) => {
  try {
    const Batch = require('../models/Batch');
    const { batchId } = req.params;

    const batch = await Batch.findOne({ batchId: batchId.toUpperCase() });

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    const status = getScoreStatus(batch.trustScore);

    res.json({
      success: true,
      data: {
        batchId: batch.batchId,
        score: batch.trustScore,
        status: status.label,
        color: status.color,
        range: { min: status.min, max: status.max }
      }
    });
  } catch (error) {
    console.error('Get trust score error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Quick demo action - simulate temperature spike
 * POST /api/simulate/spike
 */
const simulateSpike = async (req, res) => {
  try {
    const { batchId } = req.body;

    if (!batchId) {
      return res.status(400).json({
        success: false,
        error: 'batchId is required'
      });
    }

    // Generate a high temperature spike
    const result = await updateTemperature(batchId, { spike: true });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    res.json({
      success: true,
      message: `🚨 TEMPERATURE SPIKE ALERT: ${result.temperature}°C`,
      data: result
    });
  } catch (error) {
    console.error('Simulate spike error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  simulateTemperature,
  simulateLocation,
  simulateDelayEvent,
  getPrediction,
  getTrustScore,
  simulateSpike
};
