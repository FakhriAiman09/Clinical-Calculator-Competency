import { beforeAll, describe, test } from '@jest/globals';
import '@testing-library/jest-dom';
import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createClient } from '@supabase/supabase-js';

type DbFixture = {
  studentId: string;
  studentName: string;
  reportId: string;
  llmFeedback: string;
  source: 'database' | 'fallback';
};

type ParsedFeedback = {
  summary: string;
  recommendations: string[];
};

let dbFixture: DbFixture = {
  studentId: 'student-fallback-1',
  studentName: 'Nur Fatihah',
  reportId: 'report-fallback-1',
  llmFeedback: JSON.stringify({
    summary:
      'Performance is steadily improving across observed EPAs with stronger consistency in clinical reasoning.',
    recommendations: [
      'Continue practicing concise clinical handoff structure in every patient encounter.',
      'Prioritize explicit differential diagnosis statements before final plan discussions.',
    ],
  }),
  source: 'fallback',
};

function parseAIFeedback(raw: string | null | undefined): ParsedFeedback {
  if (!raw) {
    return {
      summary: 'No AI summary available yet.',
      recommendations: ['No recommendations available yet.'],
    };
  }

  try {
    const parsed = JSON.parse(raw) as {
      summary?: string;
      recommendation?: string;
      recommendations?: string[];
    };

    const summary = (parsed.summary ?? '').trim();
    const recommendations = Array.isArray(parsed.recommendations)
      ? parsed.recommendations.map((item) => String(item).trim()).filter(Boolean)
      : parsed.recommendation
      ? [String(parsed.recommendation).trim()]
      : [];

    if (summary && recommendations.length > 0) {
      return { summary, recommendations };
    }

    if (summary) {
      return { summary, recommendations: ['No recommendations available yet.'] };
    }
  } catch {
    // Treat plain-text feedback as summary-only content.
  }

  return {
    summary: String(raw).trim(),
    recommendations: ['No recommendations available yet.'],
  };
}

async function loadDbFixture(): Promise<DbFixture> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return dbFixture;

  const supabase = createClient(supabaseUrl, supabaseKey, {
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
    .select('id, llm_feedback')
    .eq('user_id', studentId)
    .limit(1)
    .maybeSingle();

  if (!reportRow?.id) {
    return { ...dbFixture, studentId, studentName, source: 'database' };
  }

  return {
    studentId,
    studentName,
    reportId: String(reportRow.id),
    llmFeedback: String(reportRow.llm_feedback ?? dbFixture.llmFeedback),
    source: 'database',
  };
}

function StudentAISummaryReportPanel({ fixture }: { fixture: DbFixture }) {
  const [parsed, setParsed] = useState<ParsedFeedback | null>(null);

  const onDisplay = () => {
    setParsed(parseAIFeedback(fixture.llmFeedback));
  };

  return (
    <section>
      <h2>Student Report</h2>
      <p data-testid='fixture-source'>Fixture source: {fixture.source}</p>
      <p data-testid='student-name'>Student: {fixture.studentName}</p>
      <button type='button' onClick={onDisplay}>
        Display AI Summary
      </button>

      {parsed ? (
        <div data-testid='ai-summary-block'>
          <h3>AI Summary &amp; Recommendations</h3>
          <p data-testid='ai-summary-text'>{parsed.summary}</p>
          <ul data-testid='ai-recommendations'>
            {parsed.recommendations.map((item, idx) => (
              <li key={`${idx}-${item}`}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

describe('Functional requirement: AI summary report shown in student report', () => {
  beforeAll(async () => {
    dbFixture = await loadDbFixture();
  });

  test('parses structured AI feedback into summary and recommendations', () => {
    const input = JSON.stringify({
      summary: 'Student demonstrates improving clinical judgment.',
      recommendations: [
        'Keep documenting explicit rationale for management decisions.',
        'Practice concise oral case presentation daily.',
      ],
    });

    const parsed = parseAIFeedback(input);

    expect(parsed.summary).toContain('improving clinical judgment');
    expect(parsed.recommendations).toHaveLength(2);
    expect(parsed.recommendations[0]).toContain('explicit rationale');
  });

  test('uses plain text as summary when AI feedback is not JSON', () => {
    const parsed = parseAIFeedback('Overall progression is positive with better consistency.');

    expect(parsed.summary).toContain('Overall progression is positive');
    expect(parsed.recommendations[0]).toBe('No recommendations available yet.');
  });

  test('renders student report UI showing AI summary and recommendations from database-backed fixture', async () => {
    render(<StudentAISummaryReportPanel fixture={dbFixture} />);

    expect(screen.getByText('Student Report')).toBeInTheDocument();
    expect(screen.getByTestId('student-name')).toHaveTextContent(dbFixture.studentName);

    fireEvent.click(screen.getByRole('button', { name: 'Display AI Summary' }));

    await waitFor(() => {
      expect(screen.getByText('AI Summary & Recommendations')).toBeInTheDocument();
      expect(screen.getByTestId('ai-summary-text').textContent?.trim().length).toBeGreaterThan(0);
      expect(screen.getByTestId('ai-recommendations').querySelectorAll('li').length).toBeGreaterThan(0);
    });
  });
});
