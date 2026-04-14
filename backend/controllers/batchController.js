const Batch = require('../models/Batch');
const Log = require('../models/Log');
const Alert = require('../models/Alert');
const mongoose = require('mongoose');
const { storeHashLocal } = require('../services/blockchainService');
const { startSimulation, stopSimulation } = require('../services/simulationService');

/**
 * Batch Controller
 * Handles CRUD operations for medicine batches
 */

/**
 * Create new batch
 * POST /api/batch/create
 */
const createBatch = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database is not connected. Please start MongoDB and retry.'
      });
    }

    const {
      batchId,
      medicineName,
      origin,
      destination,
      originCoordinates,
      destinationCoordinates,
      quantityInStock,
      temperature
    } = req.body;

    // Validate required fields
    if (!batchId || !medicineName || !origin || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: batchId, medicineName, origin, destination'
      });
    }

    // Check if batch already exists
    const existing = await Batch.findOne({ batchId: batchId.toUpperCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Batch with this ID already exists'
      });
    }

    // Import stage coordinates for initial location
    const { STAGE_COORDINATES } = require('../services/simulationService');
    const manufacturerInfo = STAGE_COORDINATES.manufacturer;

    // Create batch
    const batch = new Batch({
      batchId: batchId.toUpperCase(),
      medicineName,
      origin,
      destination,
      originCoordinates,
      destinationCoordinates,
      quantityInStock,
      temperature: temperature || 22,
      stages: [{
        name: manufacturerInfo.name,
        location: 'manufacturer',
        temperature: temperature || 22,
        coordinates: {
          lat: manufacturerInfo.lat,
          lng: manufacturerInfo.lng
        }
      }]
    });

    await batch.save();

    // Create initial log
    await Log.create({
      batchId: batch.batchId,
      type: 'temperature',
      value: batch.temperature,
      details: { message: 'Initial temperature reading' }
    });

    // Start auto-simulation for this batch
    startSimulation(batch.batchId);

    // Store initial hash on blockchain
    const hashResult = await storeHashLocal({
      batchId: batch.batchId,
      action: 'created',
      temperature: batch.temperature,
      timestamp: new Date()
    });

    batch.blockchainHash = hashResult.hash;
    await batch.save();

    res.status(201).json({
      success: true,
      data: {
        batchId: batch.batchId,
        medicineName: batch.medicineName,
        origin: batch.origin,
        destination: batch.destination,
        originCoordinates: batch.originCoordinates,
        destinationCoordinates: batch.destinationCoordinates,
        quantityInStock: batch.quantityInStock,
        currentStage: batch.currentStage,
        temperature: batch.temperature,
        trustScore: batch.trustScore,
        status: batch.status,
        blockchainHash: hashResult.hash
      }
    });
  } catch (error) {
    console.error('Create batch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get all batches
 * GET /api/batch
 */
const getAllBatches = async (req, res) => {
  try {
    const batches = await Batch.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: batches.length,
      data: batches.map(batch => ({
        batchId: batch.batchId,
        medicineName: batch.medicineName,
        origin: batch.origin,
        destination: batch.destination,
        originCoordinates: batch.originCoordinates,
        destinationCoordinates: batch.destinationCoordinates,
        quantityInStock: batch.quantityInStock,
        currentStage: batch.currentStage,
        temperature: batch.temperature,
        trustScore: batch.trustScore,
        status: batch.status,
        createdAt: batch.createdAt,
        updatedAt: batch.updatedAt
      }))
    });
  } catch (error) {
    console.error('Get batches error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get single batch
 * GET /api/batch/:id
 */
const getBatch = async (req, res) => {
  try {
    const batch = await Batch.findOne({ batchId: req.params.id.toUpperCase() });

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    // Get temperature history
    const temperatureLogs = await Log.find({
      batchId: batch.batchId,
      type: 'temperature'
    }).sort({ timestamp: -1 }).limit(50);

    // Get alerts
    const alerts = await Alert.find({ batchId: batch.batchId })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      data: {
        ...batch.toObject(),
        temperatureHistory: temperatureLogs.map(log => ({
          timestamp: log.timestamp,
          temperature: log.value,
          blockchainHash: log.blockchainHash
        })),
        alerts: alerts.map(alert => ({
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          timestamp: alert.createdAt,
          resolved: alert.resolved
        })),
        stages: batch.stages
      }
    });
  } catch (error) {
    console.error('Get batch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get batch by ID for verification (public endpoint)
 * GET /api/verify/:batchId
 */
const verifyBatch = async (req, res) => {
  try {
    const batch = await Batch.findOne({ batchId: req.params.batchId.toUpperCase() });

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    // Get all logs for verification
    const logs = await Log.find({ batchId: batch.batchId })
      .sort({ timestamp: -1 })
      .limit(100);

    // Get unresolved alerts
    const activeAlerts = await Alert.find({
      batchId: batch.batchId,
      resolved: false
    });

    res.json({
      success: true,
      data: {
        batchId: batch.batchId,
        medicineName: batch.medicineName,
        origin: batch.origin,
        destination: batch.destination,
        currentStage: batch.currentStage,
        temperature: batch.temperature,
        quantityInStock: batch.quantityInStock,
        targetTempRange: {
          min: batch.targetTempMin,
          max: batch.targetTempMax
        },
        trustScore: batch.trustScore,
        trustStatus: batch.trustScore >= 80 ? 'SAFE' : batch.trustScore >= 50 ? 'RISKY' : 'UNSAFE',
        status: batch.status,
        blockchainHash: batch.blockchainHash,
        verified: !!batch.blockchainHash,
        activeAlerts: activeAlerts.length,
        totalLogs: logs.length,
        journey: batch.stages.map(stage => ({
          stage: stage.name,
          location: stage.location,
          timestamp: stage.timestamp,
          temperature: stage.temperature
        }))
      }
    });
  } catch (error) {
    console.error('Verify batch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Delete batch and related data
 * DELETE /api/batch/:id
 */
const deleteBatch = async (req, res) => {
  try {
    const batchId = req.params.id.toUpperCase();
    const batch = await Batch.findOne({ batchId });

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    stopSimulation(batchId);

    await Promise.all([
      Log.deleteMany({ batchId }),
      Alert.deleteMany({ batchId }),
      Batch.deleteOne({ batchId })
    ]);

    res.json({
      success: true,
      message: `Batch ${batchId} deleted successfully`
    });
  } catch (error) {
    console.error('Delete batch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createBatch,
  getAllBatches,
  getBatch,
  verifyBatch,
  deleteBatch
};
