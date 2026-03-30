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
    const payloads = Array.from({ length: 20 }, (_, index) => ({
      user_id: `u${index + 1}`,
      score: (index % 4) + 1,
    }));

    const results = await Promise.all(
      payloads.map((payload) => submitSample('sample_table', payload))
    );

    expect(results).toEqual(Array(20).fill(true));
    expect(insertMock).toHaveBeenCalledTimes(20);
  });
});
