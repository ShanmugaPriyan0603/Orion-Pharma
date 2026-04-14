const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
const batchRoutes = require('./routes/batchRoutes');
const simulationRoutes = require('./routes/simulationRoutes');
const alertRoutes = require('./routes/alertRoutes');
const locationRoutes = require('./routes/locationRoutes');

app.use('/api/batch', batchRoutes);
app.use('/api/simulate', simulationRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/location', locationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const mongoConnected = mongoose.connection.readyState === 1;

  if (!mongoConnected) {
    return res.status(503).json({
      success: false,
      message: 'PharmaChain API is running, but MongoDB is disconnected',
      mongoConnected: false,
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    message: 'PharmaChain API is running',
    mongoConnected: true,
    timestamp: new Date().toISOString()
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'PharmaChain Intelligence System API',
    version: '1.0.0',
    endpoints: {
      batches: {
        'POST /api/batch/create': 'Create new medicine batch',
        'GET /api/batch': 'Get all batches',
        'GET /api/batch/:id': 'Get batch by ID',
        'GET /api/batch/verify/:batchId': 'Verify batch (public)',
        'DELETE /api/batch/:id': 'Delete a batch and related records'
      },
      simulation: {
        'POST /api/simulate/temperature': 'Simulate temperature change',
        'POST /api/simulate/location': 'Move to next stage',
        'POST /api/simulate/delay': 'Simulate delay',
        'POST /api/simulate/spike': 'Simulate temperature spike',
        'GET /api/simulate/predict/:batchId': 'Get prediction',
        'GET /api/simulate/trust/:batchId': 'Get trust score'
      },
      alerts: {
        'GET /api/alerts': 'Get all alerts',
        'GET /api/alerts/active': 'Get active alerts',
        'GET /api/alerts/stats': 'Get alert statistics',
        'GET /api/alerts/batch/:batchId': 'Get batch alerts',
        'PUT /api/alerts/:id/resolve': 'Resolve alert'
      },
      location: {
        'GET /api/location/search?query=<text>': 'Search locations globally (Nominatim)'
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

module.exports = app;
