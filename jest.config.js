module.exports = {
  preset: 'ts-jest',
  transformIgnorePatterns: ['node_modules/(?!ogl)'],
  testMatch: ['<rootDir>/tests/**/*.test.{ts,tsx}'],
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx'],
  verbose: true,
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],
}
