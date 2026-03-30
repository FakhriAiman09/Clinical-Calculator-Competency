jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({ from: jest.fn() }),
}));

jest.mock('@/utils/useRequiredRole', () => ({
  useRequireRole: jest.fn(),
}));

jest.mock('@/utils/get-epa-data', () => ({
  getEPAKFDescs: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
}));

jest.mock('react-markdown', () => () => null);
jest.mock('remark-gfm', () => ({}));

import { annotateScores, sanitize } from '@/app/dashboard/print-report/page';

describe('Functional requirement: PDF formatting helpers', () => {
  test('annotates decimal scores with development labels', () => {
    const input = 'Average scores are 2.0625 and 1.375 for this EPA.';
    const output = annotateScores(input);

    expect(output).toContain('2.0625');
    expect(output).toContain('(Developing)');
    expect(output).toContain('1.375');
    expect(output).toContain('(Early-Developing)');
  });

  test('sanitizes CSV artifacts before PDF rendering', () => {
    expect(sanitize('"Quoted text",,')).toBe('Quoted text"');
    expect(sanitize('""double""')).toBe('"double"');
  });
});
