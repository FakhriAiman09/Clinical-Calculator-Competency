const insertMock = jest.fn(async () => ({ error: null }));

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    from: jest.fn(() => ({
      insert: insertMock,
    })),
  })),
}));

import { submitSample } from '@/app/dashboard/admin/form/actions';

// Test suite for concurrent form submission handling
describe('Functional requirement: concurrent evaluation submissions', () => {
  // Clear all mocks before each test to ensure clean state
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test that submitSample handles 20 concurrent submissions
  // Generates 20 varied payloads with different user IDs and scores (1-4 range)
  // Verifies all 20 submissions succeed and database insert is called 20 times
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
