const Batch = require('../models/Batch');
const Alert = require('../models/Alert');
const Log = require('../models/Log');

/**
 * Trust Score Service
 * Calculates and updates trust scores based on events
 */

const SCORE_RULES = {
  temperature_breach: -30,
  predicted_breach: -15,
  delay: -20,
  route_deviation: -25,
  stability_bonus: 2, // Bonus for stable period
  recovery_bonus: 5   // Bonus for returning to normal after breach
};

const SCORE_THRESHOLDS = {
  SAFE: { min: 80, max: 100, label: 'SAFE', color: 'green' },
  RISKY: { min: 50, max: 79, label: 'RISKY', color: 'orange' },
  UNSAFE: { min: 0, max: 49, label: 'UNSAFE', color: 'red' }
};

/**
 * Get trust score status based on score value
 */
const getScoreStatus = (score) => {
  if (score >= SCORE_THRESHOLDS.SAFE.min) return SCORE_THRESHOLDS.SAFE;
  if (score >= SCORE_THRESHOLDS.RISKY.min) return SCORE_THRESHOLDS.RISKY;
  return SCORE_THRESHOLDS.UNSAFE;
};

/**
 * Update trust score for a batch based on an event
 */
const updateTrustScore = async (batchId, eventType, details = {}) => {
  const batch = await Batch.findOne({ batchId });
  if (!batch) return null;

  const previousScore = batch.trustScore;
  let scoreChange = 0;

  // Apply score changes based on event type
  switch (eventType) {
    case 'temperature_breach':
      scoreChange = SCORE_RULES.temperature_breach;
      break;
    case 'predicted_breach':
      scoreChange = SCORE_RULES.predicted_breach;
      break;
    case 'delay':
      scoreChange = SCORE_RULES.delay;
      break;
    case 'route_deviation':
      scoreChange = SCORE_RULES.route_deviation;
      break;
    case 'stability':
      scoreChange = SCORE_RULES.stability_bonus;
      break;
    case 'recovery':
      scoreChange = SCORE_RULES.recovery_bonus;
      break;
    default:
      scoreChange = 0;
  }

  // Calculate new score (clamped between 0 and 100)
  const newScore = Math.max(0, Math.min(100, previousScore + scoreChange));
  batch.trustScore = newScore;
  await batch.save();

  // Log the trust score change
  await Log.create({
    batchId,
    type: 'trust_score',
    value: newScore,
    previousValue: previousScore,
    details: { eventType, scoreChange }
  });

  // Create alert if score drops to critical level
  if (newScore < 50 && previousScore >= 50) {
    await Alert.create({
      batchId,
      type: 'trust_critical',
      severity: 'critical',
      message: `Trust score dropped to critical level: ${newScore}`,
      details: { previousScore, newScore, trigger: eventType }
    });
  }

  return {
    batchId,
    previousScore,
    newScore,
    scoreChange,
    status: getScoreStatus(newScore)
  };
};

/**
 * Apply stability bonus for consistent good behavior
 */
const applyStabilityBonus = async (batchId) => {
  const batch = await Batch.findOne({ batchId });
  if (!batch) return;

  // Only apply bonus if score is not already maxed and no recent breaches
  if (batch.trustScore < 100 && batch.temperature >= batch.targetTempMin && batch.temperature <= batch.targetTempMax) {
    await updateTrustScore(batchId, 'stability');
  }
};

/**
 * Calculate trust score trend (improving, stable, declining)
 */
const getScoreTrend = async (batchId) => {
  const logs = await Log.find({ batchId, type: 'trust_score' })
    .sort({ timestamp: -1 })
    .limit(10);

  if (logs.length < 2) return 'stable';

  const recent = logs.slice(0, 5);
  const older = logs.slice(5);

  const recentAvg = recent.reduce((sum, log) => sum + log.value, 0) / recent.length;
  const olderAvg = older.reduce((sum, log) => sum + log.value, 0) / older.length;

  const diff = recentAvg - olderAvg;
  if (diff > 2) return 'improving';
  if (diff < -2) return 'declining';
  return 'stable';
};

module.exports = {
  updateTrustScore,
  getScoreStatus,
  applyStabilityBonus,
  getScoreTrend,
  SCORE_THRESHOLDS
};
