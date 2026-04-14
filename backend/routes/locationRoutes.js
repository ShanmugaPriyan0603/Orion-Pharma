const express = require('express');
const router = express.Router();
const { searchLocations } = require('../controllers/locationController');

// GET /api/location/search?query=...
router.get('/search', searchLocations);

module.exports = router;
