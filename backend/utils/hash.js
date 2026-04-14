const crypto = require('crypto');

/**
 * Generate SHA256 hash of data
 * @param {Object} data - Data to hash
 * @returns {string} - Hex hash string
 */
const generateHash = (data) => {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
};

module.exports = { generateHash };
