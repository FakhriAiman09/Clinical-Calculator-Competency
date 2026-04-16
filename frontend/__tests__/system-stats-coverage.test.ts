import { createClient } from '@/utils/supabase/client';
import { getSystemStats } from '@/utils/getSystemStats';

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}));

describe('getSystemStats coverage', () => {
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('maps Supabase results and uses cache on subsequent call', async () => {
    const formResponsesSelect = jest.fn(async () => ({ count: 12 }));
    const activeEq = jest.fn(() => ({ count: 4, lt: delinquentLt }));
    function delinquentLt() {
      return { count: 2 };
    }
    const formRequestsSelect = jest.fn(() => ({ eq: activeEq }));

    const from = jest.fn((table: string) => {
      if (table === 'form_responses') return { select: formResponsesSelect };
      if (table === 'form_requests') return { select: formRequestsSelect };
      throw new Error(`Unexpected table: ${table}`);
    });

    const rpc = jest.fn(async (name: string) => {
      if (name === 'average_turnaround_days') return { data: 6.5 };
      if (name === 'get_delinquent_raters') {
        return {
          data: [
            { rater_id: 'r1', display_name: 'Rater One', email: 'r1@example.com', count: 3 },
            { rater_id: 'r2', display_name: null, email: null, count: 1 },
          ],
        };
      }
      if (name === 'monthly_form_submissions') {
        return { data: [{ month: '2026-01', count: 10 }] };
      }
      if (name === 'monthly_epa_distribution') {
        return {
          data: [
            { epa: '1', month: '2026-01', count: 5 },
            { epa: '1', month: '2026-02', count: 7 },
            { epa: '3', month: '2026-01', count: 2 },
          ],
        };
      }
      throw new Error(`Unexpected rpc: ${name}`);
    });

    mockCreateClient.mockReturnValue({ from, rpc } as never);

    const first = await getSystemStats();
    const second = await getSystemStats();

    expect(first).toEqual({
      totalSubmittedForms: 12,
      activeFormRequests: 4,
      delinquentFormRequests: 2,
      averageTurnaroundDays: 6.5,
      topDelinquentRaters: [
        { rater_id: 'r1', display_name: 'Rater One', email: 'r1@example.com', count: 3 },
        { rater_id: 'r2', display_name: 'Unknown', email: 'Unavailable', count: 1 },
      ],
      monthlySubmissionTrends: [{ month: '2026-01', count: 10 }],
      monthlyEPADistribution: {
        '1': [
          { month: '2026-01', count: 5 },
          { month: '2026-02', count: 7 },
        ],
        '3': [{ month: '2026-01', count: 2 }],
      },
    });

    expect(second).toEqual(first);

    // second call should return in-memory cache, so no new client/query calls
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledTimes(3);
    expect(rpc).toHaveBeenCalledTimes(4);
  });

  test('falls back to defaults when null/undefined values are returned', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(9_999_999_999_999);

    const formResponsesSelect = jest.fn(async () => ({ count: null }));
    const activeEq = jest.fn(() => ({ count: null, lt: () => ({ count: null }) }));
    const formRequestsSelect = jest.fn(() => ({ eq: activeEq }));

    const from = jest.fn((table: string) => {
      if (table === 'form_responses') return { select: formResponsesSelect };
      if (table === 'form_requests') return { select: formRequestsSelect };
      throw new Error(`Unexpected table: ${table}`);
    });

    const rpc = jest.fn(async (name: string) => {
      if (name === 'average_turnaround_days') return { data: null };
      if (name === 'get_delinquent_raters') return { data: null };
      if (name === 'monthly_form_submissions') return { data: null };
      if (name === 'monthly_epa_distribution') return { data: null };
      throw new Error(`Unexpected rpc: ${name}`);
    });

    mockCreateClient.mockReturnValue({ from, rpc } as never);

    const stats = await getSystemStats();

    expect(stats.totalSubmittedForms).toBe(0);
    expect(stats.activeFormRequests).toBe(0);
    expect(stats.delinquentFormRequests).toBe(0);
    expect(stats.averageTurnaroundDays).toBeNull();
    expect(stats.topDelinquentRaters).toEqual([]);
    expect(stats.monthlySubmissionTrends).toEqual([]);
    expect(stats.monthlyEPADistribution).toEqual({});

    nowSpy.mockRestore();
  });
});
