// Mock Supabase client — print-report page imports it but doesn't use it directly.
jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({ from: jest.fn() }),
}));

// Mock role guard so the page module loads without an authenticated user.
jest.mock('@/utils/useRequiredRole', () => ({
  useRequireRole: jest.fn(),
}));

// Mock EPA data fetcher — not needed for formatting helper tests.
jest.mock('@/utils/get-epa-data', () => ({
  getEPAKFDescs: jest.fn(),
}));

// Mock Next.js navigation — print-report page reads search params on mount.
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
}));

// Mock ESM-only markdown packages to prevent Jest parse errors.
jest.mock('react-markdown', () => () => null);
jest.mock('remark-gfm', () => ({}));

// annotateScores: appends a development-level label next to each decimal score value.
// sanitize: removes CSV-style quote artifacts from strings before PDF rendering.
import { annotateScores, sanitize } from '@/app/dashboard/print-report/page';

// Test suite for the two helper functions exported from the print-report page.
describe('Functional requirement: PDF formatting helpers', () => {
  // Verifies annotateScores appends readable labels, e.g. "2.0625 (Developing)".
  test('annotates decimal scores with development labels', () => {
    const input = 'Average scores are 2.0625 and 1.375 for this EPA.';
    const output = annotateScores(input);

    expect(output).toContain('2.0625');
    expect(output).toContain('(Developing)');
    expect(output).toContain('1.375');
    expect(output).toContain('(Early-Developing)');
  });

  // Verifies sanitize strips leading quotes and trailing commas left over from CSV formatting.
  test('sanitizes CSV artifacts before PDF rendering', () => {
    expect(sanitize('"Quoted text",,')).toBe('"Quoted text"');
    expect(sanitize('""double""')).toBe('"double"');
  });
});
