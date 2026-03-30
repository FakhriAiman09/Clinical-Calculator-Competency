import { beforeEach, describe, expect, jest, test } from '@jest/globals';

// Mock fs methods so logger output can be inspected without real file writes.
const appendFileSyncMock = jest.fn();
const existsSyncMock = jest.fn(() => true);
const mkdirSyncMock = jest.fn();

jest.mock('fs', () => ({
  __esModule: true,
  default: {
    appendFileSync: appendFileSyncMock,
    existsSync: existsSyncMock,
    mkdirSync: mkdirSyncMock,
  },
}));

import { logger } from '../../frontend/src/utils/logger';

// This file tests log write behavior and log content format.
describe('logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // INFO logs should include level, message, and serialized context.
  test('writes a timestamped INFO log entry with context data', () => {
    logger.info('Unit test info message', { source: 'jest' });

    expect(appendFileSyncMock).toHaveBeenCalledTimes(1);
    const writtenEntry = appendFileSyncMock.mock.calls[0][1] as string;
    expect(writtenEntry).toContain('[INFO] Unit test info message');
    expect(writtenEntry).toContain('{"source":"jest"}');
  });
});
