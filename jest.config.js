module.exports = {
  transform: {
    '^.+\\.(mjs|jsx?)$': 'babel-jest',
    '^.+\\.tsx$': 'ts-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!ogl)'],
  testMatch: ['<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}'],
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx'],
  verbose: true,
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],
}
