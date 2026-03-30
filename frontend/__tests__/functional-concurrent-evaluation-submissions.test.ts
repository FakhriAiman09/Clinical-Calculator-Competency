const insertMock = jest.fn(async () => ({ error: null }));

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    from: jest.fn(() => ({
      insert: insertMock,
    })),
  })),
}));

import { submitSample } from '@/app/dashboard/admin/form/actions';

describe('Functional requirement: concurrent evaluation submissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('handles multiple submissions simultaneously', async () => {
    const payloads = [
      { user_id: 'u1', score: 2 },
      { user_id: 'u2', score: 3 },
      { user_id: 'u3', score: 1 },
      { user_id: 'u4', score: 4 },
    ];

    const results = await Promise.all(
      payloads.map((payload) => submitSample('sample_table', payload))
    );

    expect(results).toEqual([true, true, true, true]);
    expect(insertMock).toHaveBeenCalledTimes(4);
  });
});
