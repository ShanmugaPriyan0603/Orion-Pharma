const express = require('express');
const router = express.Router();
const {
  getAllAlerts,
  getBatchAlerts,
  getActiveAlerts,
  resolveAlert,
  getAlertStats
} = require('../controllers/alertController');

// GET /api/alerts - Get all alerts
router.get('/', getAllAlerts);

// GET /api/alerts/active - Get active alerts
router.get('/active', getActiveAlerts);

// GET /api/alerts/stats - Get alert statistics
router.get('/stats', getAlertStats);

// GET /api/alerts/batch/:batchId - Get alerts for batch
router.get('/batch/:batchId', getBatchAlerts);

// PUT /api/alerts/:id/resolve - Resolve alert
router.put('/:id/resolve', resolveAlert);

module.exports = router;
