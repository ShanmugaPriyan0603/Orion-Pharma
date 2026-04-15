const Batch = require('../models/Batch');
const Log = require('../models/Log');
const Alert = require('../models/Alert');
const { updateTrustScore } = require('./trustScoreService');
const { checkTemperatureTrend } = require('./predictionService');
const { generateHash } = require('../utils/hash');

/**
 * Simulation Service
 * Simulates IoT sensor data for temperature and location
 */

// Location coordinates for each stage
const STAGE_COORDINATES = {
  manufacturer: { lat: 40.7128, lng: -74.0060, name: 'New York (Manufacturer)' },
  warehouse: { lat: 39.9526, lng: -75.1652, name: 'Philadelphia (Warehouse)' },
  distributor: { lat: 38.9072, lng: -77.0369, name: 'Washington DC (Distributor)' },
  pharmacy: { lat: 35.2271, lng: -80.8431, name: 'Charlotte (Pharmacy)' }
};

const DEFAULT_TARGET_RANGE = { min: 2, max: 8 };

const getSafeRange = (targetMin, targetMax) => {
  const min = Number(targetMin);
  const max = Number(targetMax);

  if (Number.isFinite(min) && Number.isFinite(max)) {
    return min <= max ? { min, max } : { min: max, max: min };
  }

  return DEFAULT_TARGET_RANGE;
};

/**
 * Generate realistic temperature reading
 */
const generateTemperature = (options = {}) => {
  const { breach = false, spike = false, targetMin, targetMax } = options;
  const safeRange = getSafeRange(targetMin, targetMax);

  if (breach || spike) {
    // Generate temperature outside safe range
    const breachTemp = spike
      ? safeRange.max + 8 + Math.random() * 6
      : safeRange.max + 2 + Math.random() * 5;
    return Math.round(breachTemp * 10) / 10;
  }

  // Normal temperature remains inside the configured safe range.
  const rangeWidth = Math.max(0.5, safeRange.max - safeRange.min);
  const margin = Math.min(0.4, rangeWidth * 0.2);
  const floor = safeRange.min + margin;
  const ceiling = safeRange.max - margin;
  const low = floor <= ceiling ? floor : safeRange.min;
  const high = floor <= ceiling ? ceiling : safeRange.max;
  const temp = low + Math.random() * (high - low);

  return Math.round(temp * 10) / 10;
};

/**
 * Update batch temperature with simulated reading
 */
const updateTemperature = async (batchId, options = {}) => {
  const normalizedBatchId = String(batchId || '').toUpperCase();
  const batch = await Batch.findOne({ batchId: normalizedBatchId });
  if (!batch) return null;

  const { breach = false, spike = false, manualValue = null } = options;

  const previousTemp = batch.temperature;
  const newTemp = manualValue !== null
    ? manualValue
    : generateTemperature({
        breach,
        spike,
        targetMin: batch.targetTempMin,
        targetMax: batch.targetTempMax
      });

  batch.temperature = newTemp;

  // Get current stage coordinates
  const stageInfo = STAGE_COORDINATES[batch.currentStage];

  await batch.save();

  // Create log entry
  const logData = {
    batchId: normalizedBatchId,
    type: 'temperature',
    value: newTemp,
    previousValue: previousTemp,
    coordinates: stageInfo ? { lat: stageInfo.lat, lng: stageInfo.lng } : undefined
  };

  // Generate hash for blockchain
  logData.blockchainHash = generateHash(logData);

  await Log.create(logData);

  // Check for temperature breach
  const isBreach = newTemp < batch.targetTempMin || newTemp > batch.targetTempMax;

  if (isBreach && !breach) {
    // Natural breach detected
    await Alert.create({
      batchId: normalizedBatchId,
      type: 'temperature_breach',
      severity: newTemp > 40 ? 'critical' : 'high',
      message: `Temperature breach detected: ${newTemp}°C (safe range: ${batch.targetTempMin}-${batch.targetTempMax}°C)`,
      details: { temperature: newTemp, targetMin: batch.targetTempMin, targetMax: batch.targetTempMax }
    });

    await updateTrustScore(normalizedBatchId, 'temperature_breach');
  } else if (breach || spike) {
    // Simulated breach
    await Alert.create({
      batchId: normalizedBatchId,
      type: 'temperature_breach',
      severity: spike ? 'critical' : 'high',
      message: `Temperature breach simulated: ${newTemp}°C`,
      details: { temperature: newTemp, simulated: true }
    });

    await updateTrustScore(normalizedBatchId, 'temperature_breach');
  }

  // Run prediction check
  await checkTemperatureTrend(normalizedBatchId, newTemp);

  return {
    batchId: normalizedBatchId,
    temperature: newTemp,
    previousTemp,
    isBreach,
    trustScore: batch.trustScore
  };
};

/**
 * Move batch to next stage in supply chain
 */
const moveToNextStage = async (batchId) => {
  const normalizedBatchId = String(batchId || '').toUpperCase();
  const batch = await Batch.findOne({ batchId: normalizedBatchId });
  if (!batch) return null;

  const stages = ['manufacturer', 'warehouse', 'distributor', 'pharmacy'];
  const currentIndex = stages.indexOf(batch.currentStage);

  if (currentIndex >= stages.length - 1) {
    return { batchId: normalizedBatchId, currentStage: batch.currentStage, message: 'Already at final destination' };
  }

  const nextStage = stages[currentIndex + 1];
  const previousStage = stages[currentIndex];
  const stageInfo = STAGE_COORDINATES[nextStage];

  batch.currentStage = nextStage;
  batch.temperature = generateTemperature({
    targetMin: batch.targetTempMin,
    targetMax: batch.targetTempMax
  });

  await batch.save();

  // Log the stage change
  await Log.create({
    batchId: normalizedBatchId,
    type: 'location',
    value: nextStage,
    previousValue: previousStage,
    details: { stageInfo }
  });

  // Add to stages history
  batch.stages.push({
    name: stageInfo.name,
    location: nextStage,
    temperature: batch.temperature,
    coordinates: { lat: stageInfo.lat, lng: stageInfo.lng }
  });

  await batch.save();

  return {
    batchId: normalizedBatchId,
    previousStage,
    currentStage: nextStage,
    location: stageInfo.name,
    coordinates: stageInfo,
    temperature: batch.temperature
  };
};

/**
 * Simulate delay event
 */
const simulateDelay = async (batchId) => {
  const normalizedBatchId = String(batchId || '').toUpperCase();
  const batch = await Batch.findOne({ batchId: normalizedBatchId });
  if (!batch) return null;

  await Alert.create({
    batchId: normalizedBatchId,
    type: 'delay',
    severity: 'medium',
    message: 'Shipment delay detected',
    details: { currentStage: batch.currentStage, delayHours: Math.floor(Math.random() * 24) + 1 }
  });

  await updateTrustScore(normalizedBatchId, 'delay');

  return { batchId: normalizedBatchId, message: 'Delay event simulated' };
};

/**
 * Start automatic simulation for a batch (updates every few seconds)
 */
const startAutoSimulation = (batchId) => {
  const intervalId = setInterval(async () => {
    try {
      const batch = await Batch.findOne({ batchId });
      if (!batch || batch.status === 'delivered') {
        clearInterval(intervalId);
        return;
      }

      // 10% chance of slight temperature fluctuation
      if (Math.random() < 0.1) {
        await updateTemperature(batchId);
      }

      // Small trust score recovery over time if stable
      if (batch.trustScore < 100 && batch.temperature >= batch.targetTempMin && batch.temperature <= batch.targetTempMax) {
        // Very small chance of recovery
        if (Math.random() < 0.05) {
          await updateTrustScore(batchId, 'recovery');
        }
      }
    } catch (error) {
      console.error(`Auto-simulation error for ${batchId}:`, error.message);
    }
  }, 5000); // Update every 5 seconds

  return intervalId;
};

// Store active simulation intervals
const activeSimulations = new Map();

/**
 * Start simulation for batch
 */
const startSimulation = (batchId) => {
  if (activeSimulations.has(batchId)) return false;

  const intervalId = startAutoSimulation(batchId);
  activeSimulations.set(batchId, intervalId);
  return true;
};

/**
 * Stop simulation for batch
 */
const stopSimulation = (batchId) => {
  const intervalId = activeSimulations.get(batchId);
  if (intervalId) {
    clearInterval(intervalId);
    activeSimulations.delete(batchId);
    return true;
  }
  return false;
};

module.exports = {
  updateTemperature,
  moveToNextStage,
  simulateDelay,
  startSimulation,
  stopSimulation,
  STAGE_COORDINATES,
  generateTemperature
};
