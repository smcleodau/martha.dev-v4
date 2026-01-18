/**
 * Jest setup file
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent'; // Suppress logs during tests

// Note: Global timeout is configured in jest.config.js (testTimeout: 10000)
// In ESM mode, jest global is not available in setup files

// Clean up after tests
afterAll(async () => {
  // Close database connections
  // Close Redis connections
  // Clean up resources
});
