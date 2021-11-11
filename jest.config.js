module.exports = {
  transform: {
    '^.+\\.(mjs|jsx?)$': ["babel-jest", {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-react',
        '@babel/preset-typescript',
      ],
    }],
  },
  transformIgnorePatterns: ['node_modules/(?!ogl)'],
  testMatch: ['<rootDir>/tests/**/*.test.{js,jsx}'],
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'jsx'],
  verbose: true,
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],
}
