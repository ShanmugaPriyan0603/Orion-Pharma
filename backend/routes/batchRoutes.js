const express = require('express');
const router = express.Router();
const {
  createBatch,
  getAllBatches,
  getBatch,
  verifyBatch,
  deleteBatch
} = require('../controllers/batchController');

// POST /api/batch/create - Create new batch
router.post('/create', createBatch);

// GET /api/batch - Get all batches
router.get('/', getAllBatches);

// GET /api/batch/verify/:batchId - Public verification endpoint
router.get('/verify/:batchId', verifyBatch);

// GET /api/batch/:id - Get single batch
router.get('/:id', getBatch);

// DELETE /api/batch/:id - Delete batch and related data
router.delete('/:id', deleteBatch);

module.exports = router;
