module.exports = {
  transform: {
    '^.+\\.(mjs|jsx?)$': '<rootDir>/tests/utils/transform.js',
  },
  transformIgnorePatterns: ['node_modules/(?!ogl)'],
  testMatch: ['<rootDir>/tests/**/*.test.{js,jsx}'],
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'jsx'],
  verbose: true,
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/utils/setupTests.js'],
}
