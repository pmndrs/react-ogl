module.exports = {
  transform: {
    '^.+\\.(mjs|jsx?)$': 'babel-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!ogl)'],
  testMatch: ['<rootDir>/__tests__/**/*.test.{js,jsx}'],
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'jsx'],
  verbose: true,
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/__tests__/setupTests.js'],
}
