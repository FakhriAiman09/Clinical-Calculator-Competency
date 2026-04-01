/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',

  roots: ['<rootDir>/frontend'],

  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/frontend/$1',
  },

  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },

  modulePathIgnorePatterns: [
    '<rootDir>/testing',
  ],

  testPathIgnorePatterns: [
    '/node_modules/',
  ],

  coverageProvider: 'v8',
};

module.exports = config;


