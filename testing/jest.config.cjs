/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../frontend/src/$1',
    '\\.(svg|png|jpg|jpeg|gif)$': '<rootDir>/__mocks__/svgMock.ts',
  },
  collectCoverageFrom: [
    '../frontend/src/**/*.{ts,tsx}',
    '!../frontend/src/**/*.d.ts',
    '!../frontend/src/**/database.types.ts',
    '!../frontend/src/**/types.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: '<rootDir>/coverage',
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
};

module.exports = config;
