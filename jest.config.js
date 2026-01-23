/**
 * Jest Configuration for Afro-Jamz Backend Tests
 */

export default {
  displayName: 'backend',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/backend/**/*.js',
    '!src/backend/server.js',
    '!src/backend/app.js',
    '!src/backend/config/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/backend/__tests__/setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/backend/$1'
  },
  testTimeout: 10000
};
