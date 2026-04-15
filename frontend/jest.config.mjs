import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const frontendDir = path.dirname(fileURLToPath(import.meta.url));

// Load env files in priority order without overriding existing values.
config({ path: path.join(frontendDir, '.env.test.local') });
config({ path: path.join(frontendDir, '.env.local') });
config({ path: path.join(frontendDir, '.env') });
config({ path: path.join(frontendDir, '..', '.env.test.local') });
config({ path: path.join(frontendDir, '..', '.env.local') });
config({ path: path.join(frontendDir, '..', '.env') });

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
    collectCoverageFrom: [
      'src/**/*.{ts,tsx}',
      '!src/**/*.d.ts',
      '!src/**/types.ts',
      '!src/**/types/**',
      '!src/**/__generated__/**',
    ],
};

export default jestConfig;