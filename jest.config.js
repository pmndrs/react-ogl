module.exports = {
  transform: {
    '^.+\\.(mjs|cjs|jsx?|tsx?)$': '<rootDir>/tests/utils/transform.js',
  },
  transformIgnorePatterns: ['node_modules/(?!ogl)'],
  testMatch: ['<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}'],
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx'],
  verbose: true,
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/utils/setupTests.ts'],
}
