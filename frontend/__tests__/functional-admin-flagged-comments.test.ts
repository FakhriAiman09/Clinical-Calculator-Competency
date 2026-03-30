jest.mock('next/dynamic', () => () => () => null);

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({}),
}));

jest.mock('@/utils/useRequiredRole', () => ({
  useRequireRole: jest.fn(),
}));

import { analyzeCommentsQuality, reasonLabel } from '@/app/dashboard/admin/all-reports/page';

describe('Functional requirement: admin flagged comments', () => {
  test('flags low-quality and repeated comments with reasons', () => {
    const comments = [
      'good',
      'good',
      'good',
      'ALL CAPS COMMENT WITH NO DETAILS',
      'Specific feedback because student explained rationale clearly.',
    ];

    const result = analyzeCommentsQuality(comments);

    expect(result.total).toBe(5);
    expect(result.flagged.length).toBeGreaterThan(0);
    expect(result.reasonCounts.REPEATED).toBeGreaterThan(0);
    expect(result.reasonCounts.TOO_SHORT).toBeGreaterThan(0);
    expect(result.reasonCounts.ALL_CAPS).toBeGreaterThan(0);
  });

  test('returns human-readable labels for admin flag badges', () => {
    expect(reasonLabel('TOO_SHORT' as never)).toBe('Comment too short');
    expect(reasonLabel('GENERIC' as never)).toBe('Generic / unhelpful');
    expect(reasonLabel('LOW_SIGNAL' as never)).toBe('Low signal (not specific)');
  });
});
