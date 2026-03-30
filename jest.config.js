module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/frontend/tsconfig.json',
        diagnostics: false,
      },
    ],
  },
  setupFilesAfterEnv: ['<rootDir>/testing/jest.setup.ts'],
  testMatch: ['<rootDir>/testing/tests/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    '\\.svg$': '<rootDir>/testing/__mocks__/svgMock.ts',
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
    '^@testing-library/react$': '<rootDir>/frontend/node_modules/@testing-library/react',
    '^react$': '<rootDir>/frontend/node_modules/react',
    '^react-dom$': '<rootDir>/frontend/node_modules/react-dom',
    '^react-dom/client$': '<rootDir>/frontend/node_modules/react-dom/client',
    '^react-dom/test-utils$': '<rootDir>/frontend/node_modules/react-dom/test-utils',
    '^react/jsx-runtime$': '<rootDir>/frontend/node_modules/react/jsx-runtime',
    '^react/jsx-dev-runtime$': '<rootDir>/frontend/node_modules/react/jsx-dev-runtime',
  },
};