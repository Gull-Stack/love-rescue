/**
 * Token helper utilities for testing.
 * Generates JWT tokens and authorization headers using the test JWT_SECRET.
 */

const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token for testing.
 *
 * @param {string} userId - The user ID to encode in the token
 * @param {Object} [options] - Additional jwt.sign options
 * @param {string} [options.expiresIn='7d'] - Token expiration
 * @returns {string} Signed JWT token
 */
function generateTestToken(userId, options = {}) {
  const { expiresIn = '7d', ...rest } = options;
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn, ...rest }
  );
}

/**
 * Generate an Authorization header object for testing authenticated requests.
 *
 * @param {string} userId - The user ID to encode in the token
 * @param {Object} [options] - Additional jwt.sign options
 * @returns {{ Authorization: string }} Header object with Bearer token
 */
function getAuthHeader(userId, options = {}) {
  const token = generateTestToken(userId, options);
  return { Authorization: `Bearer ${token}` };
}

module.exports = {
  generateTestToken,
  getAuthHeader
};
