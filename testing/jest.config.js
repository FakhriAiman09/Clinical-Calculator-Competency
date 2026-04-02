/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',

  roots: ['<rootDir>/tests'],

  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        strict: false,
      },
    }],
  },

  moduleNameMapper: {
    '\\.(css|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(svg|png|jpg|jpeg|gif)$': '<rootDir>/__mocks__/fileMock.js',
  },

  // Code coverage configuration
  collectCoverageFrom: [
    'tests/**/*.{ts,tsx}',
    '!tests/**/*.d.ts',
  ],

  coverageReporters: ['text', 'lcov', 'html'],

  coverageDirectory: '<rootDir>/coverage',

  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
};

module.exports = config;
