import { config } from 'dotenv';
config({ path: '.env.local' });

/** @type {import('jest').Config} */
const jestConfig = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/src/$1',
      '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      // Add if you need to mock specific packages
      '@uiw/react-markdown-preview': '<rootDir>/__mocks__/markdownPreviewMock.js',
      '@uiw/react-md-editor': '<rootDir>/__mocks__/mdEditorMock.js'
    },
    testPathIgnorePatterns: [
        '<rootDir>/node_modules/',
    ],
    transform: {
      '^.+\\.(t|j)sx?$': [
        'ts-jest',
        {
          tsconfig: '../testing/tsconfig.json',
        }
      ]
    },
};

export default jestConfig;