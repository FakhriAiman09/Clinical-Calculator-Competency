// Mock fs write and directory helpers used by logger.
const appendFileSyncMock = jest.fn();
const existsSyncMock = jest.fn(() => false);
const mkdirSyncMock = jest.fn();

// Replace Node fs module so no real file system writes happen in tests.
jest.mock('fs', () => ({
  __esModule: true,
  default: {
    appendFileSync: appendFileSyncMock,
    existsSync: existsSyncMock,
    mkdirSync: mkdirSyncMock,
  },
}));

import { logger } from '@/utils/logger';

// Tests for writing structured error logs.
describe('Functional requirement: error log file', () => {
  // Clear mock history before each test.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Should create log folder (if needed) and append one ERROR log line with context.
  test('writes ERROR entry to error.log with context', () => {
    logger.error('Critical failure during evaluation submit', {
      requestId: 'req-88',
      userId: 'rater-1',
    });

    expect(mkdirSyncMock).toHaveBeenCalled();
    expect(appendFileSyncMock).toHaveBeenCalledTimes(1);

    const written = appendFileSyncMock.mock.calls[0][1] as string;
    expect(written).toContain('[ERROR] Critical failure during evaluation submit');
    expect(written).toContain('"requestId":"req-88"');
    expect(written).toContain('"userId":"rater-1"');
  });
});
