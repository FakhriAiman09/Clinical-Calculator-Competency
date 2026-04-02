import { beforeAll, describe, jest, test } from '@jest/globals';
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { createClient as createPublicClient } from '@supabase/supabase-js';

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

type DbFixture = {
  studentName: string;
  rawNarrative: string;
  source: 'database' | 'fallback';
};

let dbFixture: DbFixture = {
  studentName: 'Nur Fatihah',
  rawNarrative: 'Average score is 2.0625, based on EPA evidence.',
  source: 'fallback',
};

async function loadDbFixture(): Promise<DbFixture> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return dbFixture;

  const supabase = createPublicClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id, display_name')
    .ilike('display_name', '%fatihah%')
    .limit(1)
    .maybeSingle();

  if (!profileRow?.id) return dbFixture;

  const studentId = String(profileRow.id);
  const studentName = String(profileRow.display_name ?? 'Nur Fatihah');

  const { data: reportRow } = await supabase
    .from('student_reports')
    .select('report_data, llm_feedback')
    .eq('user_id', studentId)
    .limit(1)
    .maybeSingle();

  if (!reportRow) return { ...dbFixture, studentName, source: 'database' };

  const reportData = (reportRow.report_data ?? {}) as Record<string, number>;
  const firstScore = Object.values(reportData)[0];
  const scoreText = typeof firstScore === 'number' ? `${firstScore}` : '2.0625';

  return {
    studentName,
    rawNarrative: `"${reportRow.llm_feedback ?? `Average score is ${scoreText}`}",,`,
    source: 'database',
  };
}

function PDFPreviewPanel({ fixture }: { fixture: DbFixture }) {
  const sanitized = sanitize(fixture.rawNarrative);
  const annotated = annotateScores(`${sanitized} Score marker 2.0625`);

  return (
    <section>
      <h2>PDF Preview</h2>
      <p data-testid='pdf-student'>Student: {fixture.studentName}</p>
      <p data-testid='pdf-source'>Fixture source: {fixture.source}</p>
      <div data-testid='pdf-body'>{annotated}</div>
    </section>
  );
}

// Test suite for the two helper functions exported from the print-report page.
describe('Functional requirement: PDF formatting helpers', () => {
  beforeAll(async () => {
    dbFixture = await loadDbFixture();
  });

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
    expect(sanitize('"Quoted text",,')).toBe('Quoted text"');
    expect(sanitize('""double""')).toBe('"double"');
  });

  test('renders PDF preview UI using database-backed fixture and formatted output', () => {
    render(<PDFPreviewPanel fixture={dbFixture} />);

    expect(screen.getByText('PDF Preview')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-student')).toHaveTextContent(dbFixture.studentName);
    expect(screen.getByTestId('pdf-source')).toHaveTextContent(dbFixture.source);
    expect(screen.getByTestId('pdf-body')).toHaveTextContent('(Developing)');
  });
});
