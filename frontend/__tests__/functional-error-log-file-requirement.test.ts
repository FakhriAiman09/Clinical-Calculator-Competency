const appendFileSyncMock = jest.fn();
const existsSyncMock = jest.fn(() => false);
const mkdirSyncMock = jest.fn();

jest.mock('fs', () => ({
  __esModule: true,
  default: {
    appendFileSync: appendFileSyncMock,
    existsSync: existsSyncMock,
    mkdirSync: mkdirSyncMock,
  },
}));

import { logger } from '@/utils/logger';

describe('Functional requirement: error log file', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
