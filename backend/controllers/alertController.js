const Alert = require('../models/Alert');
const Batch = require('../models/Batch');

const attachBatchDetails = async (alerts) => {
  const batchIds = [...new Set(alerts.map((alert) => String(alert.batchId || '').toUpperCase()).filter(Boolean))];
  if (batchIds.length === 0) {
    return alerts.map((alert) => ({
      alert,
      batch: null
    }));
  }

  const batches = await Batch.find({ batchId: { $in: batchIds } })
    .select('batchId medicineName currentStage')
    .lean();

  const batchById = new Map(batches.map((batch) => [String(batch.batchId).toUpperCase(), batch]));

  return alerts.map((alert) => {
    const key = String(alert.batchId || '').toUpperCase();
    return {
      alert,
      batch: batchById.get(key) || null
    };
  });
};

/**
 * Alert Controller
 * Handles alert management
 */

/**
 * Get all alerts
 * GET /api/alerts
 */
const getAllAlerts = async (req, res) => {
  try {
    const { resolved, limit = 50 } = req.query;

    const query = {};
    if (resolved !== undefined) {
      query.resolved = resolved === 'true';
    }

    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const mappedAlerts = await attachBatchDetails(alerts);

    res.json({
      success: true,
      count: alerts.length,
      data: mappedAlerts.map(({ alert, batch }) => ({
        id: alert._id,
        batchId: alert.batchId,
        medicineName: batch ? batch.medicineName : null,
        currentStage: batch ? batch.currentStage : null,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        details: alert.details,
        resolved: alert.resolved,
        resolvedAt: alert.resolvedAt,
        createdAt: alert.createdAt
      }))
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get alerts for specific batch
 * GET /api/alerts/batch/:batchId
 */
const getBatchAlerts = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { resolved, limit = 20 } = req.query;

    const query = { batchId: batchId.toUpperCase() };
    if (resolved !== undefined) {
      query.resolved = resolved === 'true';
    }

    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: alerts.length,
      data: alerts.map(alert => ({
        id: alert._id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        details: alert.details,
        resolved: alert.resolved,
        resolvedAt: alert.resolvedAt,
        createdAt: alert.createdAt
      }))
    });
  } catch (error) {
    console.error('Get batch alerts error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get active (unresolved) alerts
 * GET /api/alerts/active
 */
const getActiveAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({ resolved: false })
      .sort({ createdAt: -1 });

    const mappedAlerts = await attachBatchDetails(alerts);

    // Count by severity
    const severityCount = {
      critical: alerts.filter(a => a.severity === 'critical').length,
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      low: alerts.filter(a => a.severity === 'low').length
    };

    res.json({
      success: true,
      count: alerts.length,
      severityCount,
      data: mappedAlerts.map(({ alert, batch }) => ({
        id: alert._id,
        batchId: alert.batchId,
        medicineName: batch ? batch.medicineName : null,
        currentStage: batch ? batch.currentStage : null,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        createdAt: alert.createdAt
      }))
    });
  } catch (error) {
    console.error('Get active alerts error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Resolve an alert
 * PUT /api/alerts/:id/resolve
 */
const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await Alert.findById(id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();
    await alert.save();

    res.json({
      success: true,
      message: 'Alert resolved',
      data: {
        id: alert._id,
        resolved: true,
        resolvedAt: alert.resolvedAt
      }
    });
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get alert statistics
 * GET /api/alerts/stats
 */
const getAlertStats = async (req, res) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now - 24 * 60 * 60 * 1000);

    // Total alerts
    const totalAlerts = await Alert.countDocuments();

    // Active alerts
    const activeAlerts = await Alert.countDocuments({ resolved: false });

    // Alerts in last 24 hours
    const recentAlerts = await Alert.countDocuments({ createdAt: { $gte: last24Hours } });

    // Count by type
    const typeCount = await Alert.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    // Count by severity
    const severityCount = await Alert.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        total: totalAlerts,
        active: activeAlerts,
        last24Hours: recentAlerts,
        byType: typeCount.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        bySeverity: severityCount.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Get alert stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getAllAlerts,
  getBatchAlerts,
  getActiveAlerts,
  resolveAlert,
  getAlertStats
};
