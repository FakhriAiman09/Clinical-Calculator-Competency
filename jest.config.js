module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jest-environment-jsdom',
    transform: {
      '^.+\\.(ts|tsx|js|jsx)$': 'ts-jest',
    },
    setupFilesAfterEnv: ['<rootDir>/testing/jest.setup.ts'],
    testMatch: ['<rootDir>/testing/tests/**/*.test.{ts,tsx}'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/frontend/src/$1',
        '\\.svg$': '<rootDir>/testing/__mocks__/svgMock.ts',
      },
  };