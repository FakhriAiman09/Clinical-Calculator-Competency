import { beforeAll, beforeEach, describe, jest, test } from '@jest/globals';
import '@testing-library/jest-dom';
import React, { useMemo, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createClient as createPublicClient } from '@supabase/supabase-js';

type DbFixture = {
  studentId: string;
  source: 'database' | 'fallback';
};

let dbFixture: DbFixture = {
  studentId: 'student-fallback-1',
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

  return {
    studentId: String(profileRow.id),
    source: 'database',
  };
}

const insertMock = jest.fn(async (_payload: unknown) => ({ error: null }));

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    from: jest.fn(() => ({
      insert: insertMock,
    })),
  })),
}));

import { submitSample } from '@/app/dashboard/admin/form/actions';

type ConcurrentPanelProps = {
  payloadCount: number;
};

function ConcurrentSubmissionPanel({ payloadCount }: ConcurrentPanelProps) {
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [success, setSuccess] = useState(0);

  const payloads = useMemo(
    () =>
      Array.from({ length: payloadCount }, (_, index) => ({
        user_id: `${dbFixture.studentId}-${index + 1}`,
        score: (index % 4) + 1,
      })),
    [payloadCount]
  );

  const runConcurrentSubmission = async () => {
    setRunning(true);

    const results = await Promise.all(payloads.map((payload) => submitSample('sample_table', payload)));
    const successCount = results.filter(Boolean).length;

    setCompleted(results.length);
    setSuccess(successCount);
    setRunning(false);
  };

  return (
    <section>
      <h2>Concurrent Evaluation Submission</h2>
      <p data-testid='fixture-source'>Fixture source: {dbFixture.source}</p>
      <p data-testid='fixture-student'>Student ID: {dbFixture.studentId}</p>
      <button type='button' onClick={runConcurrentSubmission} disabled={running}>
        {running ? 'Running...' : 'Run Concurrent Submissions'}
      </button>
      <p data-testid='run-summary'>
        Completed: {completed}/{payloadCount}
      </p>
      <p data-testid='success-summary'>Successful: {success}</p>
    </section>
  );
}

// Test suite for concurrent form submission handling
describe('Functional requirement: concurrent evaluation submissions', () => {
  beforeAll(async () => {
    dbFixture = await loadDbFixture();
  });

  // Clear all mocks before each test to ensure clean state
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test that submitSample handles 20 concurrent submissions
  // Generates 20 varied payloads with different user IDs and scores (1-4 range)
  // Verifies all 20 submissions succeed and database insert is called 20 times
  test('handles multiple submissions simultaneously', async () => {
    const payloads = Array.from({ length: 50 }, (_, index) => ({
      user_id: `${dbFixture.studentId}-${index + 1}`,
      score: (index % 4) + 1,
    }));

    const results = await Promise.all(
      payloads.map((payload) => submitSample('sample_table', payload))
    );

    expect(results).toEqual(Array(50).fill(true));
    expect(insertMock).toHaveBeenCalledTimes(50);
  });

  test('renders UI summary for concurrent submissions using database-backed student fixture', async () => {
    render(<ConcurrentSubmissionPanel payloadCount={50} />);

    expect(screen.getByText('Concurrent Evaluation Submission')).toBeInTheDocument();
    expect(screen.getByTestId('fixture-student')).toHaveTextContent(dbFixture.studentId);

    fireEvent.click(screen.getByRole('button', { name: 'Run Concurrent Submissions' }));

    await waitFor(() => {
      expect(screen.getByTestId('run-summary')).toHaveTextContent('Completed: 50/50');
      expect(screen.getByTestId('success-summary')).toHaveTextContent('Successful: 50');
      expect(insertMock).toHaveBeenCalledTimes(50);
    });
  });
});
