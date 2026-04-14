const Batch = require('../models/Batch');
const Log = require('../models/Log');
const Alert = require('../models/Alert');
const { updateTrustScore } = require('./trustScoreService');

/**
 * Prediction Service
 * Predicts future temperature breaches using trend analysis
 */

const TEMPERATURE_HISTORY_SIZE = 5;
const RISING_THRESHOLD = 2; // degrees per reading
const CRITICAL_RISING_THRESHOLD = 3;

/**
 * Get recent temperature history for a batch
 */
const getTemperatureHistory = async (batchId, limit = TEMPERATURE_HISTORY_SIZE) => {
  const logs = await Log.find({ batchId, type: 'temperature' })
    .sort({ timestamp: -1 })
    .limit(limit);

  return logs.reverse().map(log => log.value);
};

/**
 * Calculate temperature trend
 * Returns: 'rising', 'falling', 'stable'
 */
const calculateTrend = (temperatures) => {
  if (temperatures.length < 2) return 'stable';

  let risingCount = 0;
  let fallingCount = 0;

  for (let i = 1; i < temperatures.length; i++) {
    const diff = temperatures[i] - temperatures[i - 1];
    if (diff > 0.5) risingCount++;
    else if (diff < -0.5) fallingCount++;
  }

  const total = temperatures.length - 1;
  if (risingCount > total * 0.6) return 'rising';
  if (fallingCount > total * 0.6) return 'falling';
  return 'stable';
};

/**
 * Calculate rate of temperature change
 */
const calculateRateOfChange = (temperatures) => {
  if (temperatures.length < 2) return 0;

  const diffs = [];
  for (let i = 1; i < temperatures.length; i++) {
    diffs.push(temperatures[i] - temperatures[i - 1]);
  }

  const avgRate = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  return avgRate;
};

/**
 * Predict if temperature will breach soon
 */
const predictBreach = async (batchId) => {
  const batch = await Batch.findOne({ batchId });
  if (!batch) return null;

  const history = await getTemperatureHistory(batchId);
  if (history.length < 2) return { willBreach: false, reason: 'Insufficient data' };

  const trend = calculateTrend(history);
  const rateOfChange = calculateRateOfChange(history);
  const currentTemp = history[history.length - 1];

  // Calculate predicted temperature (next reading)
  const predictedTemp = currentTemp + rateOfChange;

  // Check if breach is likely
  let willBreach = false;
  let breachType = null;
  let confidence = 0;

  if (trend === 'rising') {
    if (predictedTemp > batch.targetTempMax) {
      willBreach = true;
      breachType = 'high';
      confidence = Math.min(100, Math.abs(rateOfChange) * 30);
    } else if (currentTemp > batch.targetTempMax - 3 && rateOfChange > RISING_THRESHOLD / 2) {
      // Approaching upper limit
      willBreach = true;
      breachType = 'high_warning';
      confidence = 60;
    }
  } else if (trend === 'falling') {
    if (predictedTemp < batch.targetTempMin) {
      willBreach = true;
      breachType = 'low';
      confidence = Math.min(100, Math.abs(rateOfChange) * 30);
    } else if (currentTemp < batch.targetTempMin + 3 && rateOfChange < -RISING_THRESHOLD / 2) {
      // Approaching lower limit
      willBreach = true;
      breachType = 'low_warning';
      confidence = 60;
    }
  }

  return {
    willBreach,
    breachType,
    confidence: Math.round(confidence),
    trend,
    rateOfChange: Math.round(rateOfChange * 10) / 10,
    currentTemp,
    predictedTemp: Math.round(predictedTemp * 10) / 10,
    targetRange: { min: batch.targetTempMin, max: batch.targetTempMax }
  };
};

/**
 * Check temperature trend and create alerts if needed
 */
const checkTemperatureTrend = async (batchId, currentTemp) => {
  const batch = await Batch.findOne({ batchId });
  if (!batch) return;

  const history = await getTemperatureHistory(batchId, TEMPERATURE_HISTORY_SIZE + 1);
  history.push(currentTemp); // Add current reading

  const trend = calculateTrend(history);
  const rateOfChange = calculateRateOfChange(history);

  // Check for rapid temperature rise
  if (rateOfChange > CRITICAL_RISING_THRESHOLD) {
    // Check if we already have a recent predicted breach alert
    const recentAlert = await Alert.findOne({
      batchId,
      type: 'predicted_breach',
      resolved: false,
      createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
    });

    if (!recentAlert) {
      await Alert.create({
        batchId,
        type: 'predicted_breach',
        severity: 'high',
        message: `Rapid temperature increase detected! Rising at ${rateOfChange.toFixed(1)}°C per reading`,
        details: { trend, rateOfChange, currentTemp }
      });

      await updateTrustScore(batchId, 'predicted_breach');
    }
  }

  // Check for approaching upper limit
  if (currentTemp > batch.targetTempMax - 3 && trend === 'rising') {
    const recentWarning = await Alert.findOne({
      batchId,
      type: 'predicted_breach',
      severity: 'medium',
      resolved: false,
      createdAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) } // Last 10 minutes
    });

    if (!recentWarning) {
      await Alert.create({
        batchId,
        type: 'predicted_breach',
        severity: 'medium',
        message: `Temperature approaching upper limit (${currentTemp}°C of ${batch.targetTempMax}°C max)`,
        details: { trend, currentTemp, targetMax: batch.targetTempMax }
      });
    }
  }

  return { trend, rateOfChange };
};

/**
 * Get comprehensive prediction report for a batch
 */
const getPredictionReport = async (batchId) => {
  const prediction = await predictBreach(batchId);
  const batch = await Batch.findOne({ batchId });

  if (!batch) return null;

  return {
    batchId,
    currentTemperature: batch.temperature,
    targetRange: { min: batch.targetTempMin, max: batch.targetTempMax },
    prediction,
    recommendation: getRecommendation(prediction, batch)
  };
};

/**
 * Get recommendation based on prediction
 */
const getRecommendation = (prediction, batch) => {
  if (!prediction.willBreach) {
    return 'Continue monitoring. No immediate action required.';
  }

  switch (prediction.breachType) {
    case 'high':
      return 'URGENT: Activate cooling systems immediately. Temperature predicted to exceed safe range.';
    case 'high_warning':
      return 'WARNING: Monitor closely. Temperature approaching upper limit.';
    case 'low':
      return 'URGENT: Activate heating systems. Temperature predicted to drop below safe range.';
    case 'low_warning':
      return 'WARNING: Monitor closely. Temperature approaching lower limit.';
    default:
      return 'Monitor temperature trends.';
  }
};

module.exports = {
  predictBreach,
  checkTemperatureTrend,
  getPredictionReport,
  getTemperatureHistory,
  calculateTrend,
  calculateRateOfChange
};
