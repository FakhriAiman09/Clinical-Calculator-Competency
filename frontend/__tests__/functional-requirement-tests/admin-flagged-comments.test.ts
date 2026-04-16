import { beforeAll, describe, jest, test } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('next/dynamic', () => () => () => null);

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({}),
}));

jest.mock('@/utils/useRequiredRole', () => ({
  useRequireRole: jest.fn(),
}));

import { analyzeCommentsQuality, reasonLabel } from '@/utils/comment-quality';

type DbCommentFixture = {
  comments: string[];
  source: 'database' | 'fallback';
};

let dbCommentFixture: DbCommentFixture = {
  source: 'fallback',
  comments: [
    'good',
    'good',
    'good',
    'ALL CAPS COMMENT WITH NO DETAILS',
    'Specific feedback because student explained rationale clearly.',
  ],
};

function AdminFlagSummary({ comments }: { comments: string[] }) {
  const result = analyzeCommentsQuality(comments);
  const activeReasons = Object.entries(result.reasonCounts)
    .filter(([, count]) => count > 0)
    .map(([reason]) => reason);

  return React.createElement(
    'section',
    null,
    React.createElement('h2', null, 'Comment Quality Checks'),
    React.createElement('p', null, `Total comments: ${result.total}`),
    React.createElement('p', null, `Flagged comments: ${result.flagged.length}`),
    React.createElement(
      'div',
      null,
      ...activeReasons.map((reason) =>
        React.createElement('span', { key: `summary-${reason}` }, reasonLabel(reason as never))
      )
    ),
    React.createElement(
      'ul',
      null,
      ...result.flagged.slice(0, 3).map((entry, entryIndex) =>
        React.createElement(
          'li',
          { key: `${entryIndex}-${entry.text}-${entry.reasons.join('-')}` },
          ...entry.reasons.map((reason, reasonIndex) =>
            React.createElement('span', { key: `${entryIndex}-${reasonIndex}-${entry.text}-${reason}` }, reasonLabel(reason))
          )
        )
      )
    )
  );
}

function extractCommentsFromResponseRoot(responseRoot: unknown): string[] {
  if (!responseRoot || typeof responseRoot !== 'object') {
    return [];
  }

  const collected: string[] = [];

  for (const epaBlock of Object.values(responseRoot as Record<string, unknown>)) {
    if (!epaBlock || typeof epaBlock !== 'object') {
      continue;
    }

    for (const keyFunctionObj of Object.values(epaBlock as Record<string, unknown>)) {
      if (!keyFunctionObj || typeof keyFunctionObj !== 'object') {
        continue;
      }

      const textValue = (keyFunctionObj as { text?: unknown }).text;
      if (!Array.isArray(textValue)) {
        continue;
      }

      collected.push(
        ...textValue.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '')
      );
    }
  }

  return collected;
}

async function loadDbCommentsFixture(): Promise<DbCommentFixture> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return dbCommentFixture;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: rows } = await supabase
    .from('form_responses')
    .select('response')
    .limit(25);

  if (!Array.isArray(rows) || rows.length === 0) {
    return dbCommentFixture;
  }

  const dbComments: string[] = [];
  for (const row of rows as Array<{ response?: unknown }>) {
    const responseRoot = (row.response as { response?: unknown } | null | undefined)?.response;
    dbComments.push(...extractCommentsFromResponseRoot(responseRoot));
  }

  if (dbComments.length < 3) {
    return dbCommentFixture;
  }

  return {
    source: 'database',
    comments: dbComments,
  };
}

// Test suite for admin comment quality analysis and flag labeling
// analyzeCommentsQuality: detects repeated, generic, or low-quality comments
// reasonLabel: converts flag reason codes to human-readable text for admin UI badges
describe('Functional requirement: admin flagged comments', () => {
  beforeAll(async () => {
    dbCommentFixture = await loadDbCommentsFixture();
  });
 
  test('flags low-quality and repeated comments with reasons', () => {
    const comments = [...dbCommentFixture.comments, 'good', 'good', 'ALL CAPS COMMENT'];
    const result = analyzeCommentsQuality(comments);

    expect(comments.length).toBeGreaterThan(0);
    expect(result.total).toBe(comments.length);
    expect(result.flagged.length).toBeGreaterThan(0);

    if (dbCommentFixture.source === 'fallback') {
      expect(result.reasonCounts.REPEATED).toBeGreaterThan(0);
      expect(result.reasonCounts.TOO_SHORT).toBeGreaterThan(0);
      expect(result.reasonCounts.ALL_CAPS).toBeGreaterThan(0);
    }
  });

  test('returns human-readable labels for admin flag badges', () => {
    expect(reasonLabel('TOO_SHORT' as never)).toBe('Comment too short');
    expect(reasonLabel('GENERIC' as never)).toBe('Generic / unhelpful');
    expect(reasonLabel('LOW_SIGNAL' as never)).toBe('Low signal (not specific)');
  });

  test('renders comment-quality UI from database-backed inputs', () => {
    const comments = [...dbCommentFixture.comments, 'good', 'good', 'ALL CAPS COMMENT'];
    const result = analyzeCommentsQuality(comments);
    render(React.createElement(AdminFlagSummary, { comments }));

    expect(screen.getByText('Comment Quality Checks')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Total comments: ${comments.length}`))).toBeInTheDocument();
    expect(screen.getByText(/Flagged comments:/)).toBeInTheDocument();
    expect(screen.getAllByText('Comment too short').length).toBeGreaterThan(0);
    expect(screen.getByText('All caps')).toBeInTheDocument();

    if (result.reasonCounts.REPEATED > 0) {
      expect(screen.getAllByText('Repeated comment').length).toBeGreaterThan(0);
    }
  });
});
