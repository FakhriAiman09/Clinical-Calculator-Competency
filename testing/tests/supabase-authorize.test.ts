import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const rpcMock = jest.fn();
const schemaMock = jest.fn(() => ({ rpc: rpcMock }));
const createClientMock = jest.fn(async () => ({ schema: schemaMock }));

jest.mock('@/utils/supabase/server', () => ({
  createClient: createClientMock,
}));

import { supabase_authorize } from '../../frontend/src/utils/async-util';

describe('supabase_authorize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns true when all requested permissions are granted', async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });

    await expect(supabase_authorize(['admin.read', 'admin.write'])).resolves.toBe(true);
    expect(rpcMock).toHaveBeenCalledTimes(2);
  });

  test('returns false when any permission check fails', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'denied' } });

    await expect(supabase_authorize(['admin.read', 'admin.delete'])).resolves.toBe(false);
    expect(rpcMock).toHaveBeenCalledTimes(2);
  });
});
