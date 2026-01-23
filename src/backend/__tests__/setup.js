/**
 * Jest Setup File
 * Initializes test environment and global test utilities
 */

// Suppress console output during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.COMMISSION_RATE = '0.30';
process.env.HOLD_DAYS = '14';

// Global test utilities
global.testUtils = {
  createMockUser: (overrides = {}) => ({
    id: 1,
    email: 'test@example.com',
    role: 'buyer',
    ...overrides
  }),

  createMockBeat: (overrides = {}) => ({
    id: 1,
    producer_id: 1,
    title: 'Test Beat',
    genre: 'Hip-Hop',
    status: 'enabled',
    is_active: 1,
    ...overrides
  }),

  createMockLicense: (overrides = {}) => ({
    id: 1,
    name: 'WAV Lease',
    price: 49.99,
    description: 'Premium license',
    usage_rights: 'Up to 10,000 streams',
    ...overrides
  }),

  createMockPaymentMethod: (overrides = {}) => ({
    id: 1,
    provider: 'stripe',
    reference_id: 'pm_test123',
    is_default: true,
    ...overrides
  }),

  createMockPurchase: (overrides = {}) => ({
    id: 1,
    buyer_id: 1,
    beat_id: 1,
    license_id: 1,
    price: 49.99,
    commission: 14.997,
    seller_earnings: 34.993,
    payout_status: 'unpaid',
    purchased_at: new Date().toISOString(),
    ...overrides
  })
};

// Mock database for testing
global.mockDB = {
  get: jest.fn(),
  all: jest.fn(),
  run: jest.fn(),
  prepare: jest.fn(() => ({
    run: jest.fn(),
    finalize: jest.fn()
  }))
};

// Global error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
