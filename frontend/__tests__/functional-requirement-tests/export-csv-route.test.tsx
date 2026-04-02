/** @jest-environment jsdom */

import { beforeAll, beforeEach, describe, jest, test } from '@jest/globals';
import '@testing-library/jest-dom';
import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createClient as createPublicClient } from '@supabase/supabase-js';

jest.mock('next/server', () => {
  class MockNextResponse {
    body: string;
    status: number;
    headers: { get: (name: string) => string | null };

    constructor(body: string, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body;
      this.status = init?.status ?? 200;
      const store = Object.fromEntries(
        Object.entries(init?.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])
      );
      this.headers = {
        get: (name: string) => store[name.toLowerCase()] ?? null,
      };
    }

    static json(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      const headers = {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      };
      return new MockNextResponse(JSON.stringify(data), { status: init?.status ?? 200, headers });
    }

    async json() {
      return JSON.parse(this.body || '{}');
    }

    async text() {
      return this.body;
    }
  }

  class MockNextRequest {
    url: string;
    constructor(url: string) {
      this.url = url;
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  };
});

// Mock server-side Supabase client used by the route handler.
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock logger to avoid writing real logs during tests.
jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import { createClient } from '@/utils/supabase/server';

const createClientMock = createClient as jest.Mock;

type DbFixture = {
  studentId: string;
  reportId: string;
  studentName: string;
  source: 'database' | 'fallback';
};

let dbFixture: DbFixture = {
  studentId: 'stu-1',
  reportId: 'rep-1',
  studentName: 'Nur Fatihah',
  source: 'fallback',
};

function getRouteHandler() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const routeModule = require('@/app/api/generate-csv/route') as {
    GET: (request: { url: string }) => Promise<{ status: number; headers: { get: (name: string) => string | null }; text: () => Promise<string>; json: () => Promise<unknown> }>;
  };
  return routeModule.GET;
}

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

  const { data: reportRow } = await supabase
    .from('student_reports')
    .select('id')
    .eq('user_id', String(profileRow.id))
    .limit(1)
    .maybeSingle();

  if (!reportRow?.id) return dbFixture;

  return {
    studentId: String(profileRow.id),
    reportId: String(reportRow.id),
    studentName: String(profileRow.display_name ?? 'Nur Fatihah'),
    source: 'database',
  };
}

function CSVExportPanel() {
  const [status, setStatus] = useState('Idle');
  const [preview, setPreview] = useState('');

  const runExportPreview = async () => {
    setStatus('Generating...');
    const GET = getRouteHandler();
    const response = await GET({
      url: `http://localhost/api/generate-csv?studentId=${dbFixture.studentId}&reportId=${dbFixture.reportId}`,
    } as never);

    if (response.status >= 400) {
      setStatus(`Failed (${response.status})`);
      return;
    }

    const csv = await response.text();
    setPreview(csv);
    setStatus('Generated');
  };

  return (
    <section>
      <h2>CSV Export</h2>
      <p data-testid='csv-fixture-source'>Fixture source: {dbFixture.source}</p>
      <p data-testid='csv-fixture-student'>Student: {dbFixture.studentName}</p>
      <button type='button' onClick={runExportPreview}>
        Generate CSV Preview
      </button>
      <p data-testid='csv-status'>{status}</p>
      <pre data-testid='csv-preview'>{preview}</pre>
    </section>
  );
}

describe('Functional requirement: CSV export route', () => {
  beforeAll(async () => {
    dbFixture = await loadDbFixture();
  });

  // Reset mock call history before each test run.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const buildMockClient = () => ({
    from: jest.fn((table: string) => {
      if (table === 'student_reports') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(async () => ({
                  data: {
                    id: dbFixture.reportId,
                    user_id: dbFixture.studentId,
                    title: 'Quarterly Report',
                    time_window: '3m',
                    report_data: { '1.1': 2.25 },
                    llm_feedback: 'Strong progress with clear communication.',
                    created_at: '2026-03-01T00:00:00Z',
                  },
                  error: null,
                })),
              })),
            })),
          })),
        };
      }

      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(async () => ({
                data: { display_name: dbFixture.studentName },
                error: null,
              })),
            })),
          })),
        };
      }

      if (table === 'form_requests') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(async () => ({
              data: [{ id: 'req-1' }],
              error: null,
            })),
          })),
        };
      }

      if (table === 'form_responses') {
        return {
          select: jest.fn(() => ({
            in: jest.fn(async () => ({
              data: [{ response_id: 'resp-1' }],
              error: null,
            })),
          })),
        };
      }

      if (table === 'form_results') {
        return {
          select: jest.fn(() => ({
            in: jest.fn(async () => ({
              data: [
                {
                  response_id: 'resp-1',
                  created_at: '2026-03-01T00:00:00Z',
                  results: { '1.1': 2.1 },
                },
              ],
              error: null,
            })),
          })),
        };
      }

      return { select: jest.fn(async () => ({ data: [], error: null })) };
    }),
  });

  // Verifies API returns 400 when studentId/reportId query params are missing.
  test('returns 400 when required query parameters are missing', async () => {
    const GET = getRouteHandler();
    const response = await GET({ url: 'http://localhost/api/generate-csv' } as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'Missing studentId or reportId' });
  });

  // Verifies API returns a downloadable CSV when report and related data are available.
  test('returns downloadable CSV when report data exists', async () => {
    const GET = getRouteHandler();
    // Mock table-by-table Supabase responses the route expects to build CSV content.
    const mockClient = buildMockClient();

    createClientMock.mockResolvedValue(mockClient as never);

    // Call API with required query params.
    const response = await GET({
      url: `http://localhost/api/generate-csv?studentId=${dbFixture.studentId}&reportId=${dbFixture.reportId}`,
    } as never);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/csv');
    expect(response.headers.get('Content-Disposition')).toContain('.csv');

    // Validate CSV body includes expected sections and key values.
    const body = await response.text();
    expect(body).toContain('Clinical Competency Calculator - Student Report');
    expect(body).toContain(dbFixture.studentName);
    expect(body).toContain('--- AI FEEDBACK ---');
  });

  test('renders CSV export UI and displays generated CSV preview with database-backed fixture values', async () => {
    createClientMock.mockResolvedValue(buildMockClient() as never);

    render(<CSVExportPanel />);

    expect(screen.getByText('CSV Export')).toBeInTheDocument();
    expect(screen.getByTestId('csv-fixture-student')).toHaveTextContent(dbFixture.studentName);

    fireEvent.click(screen.getByRole('button', { name: 'Generate CSV Preview' }));

    await waitFor(() => {
      expect(screen.getByTestId('csv-status')).toHaveTextContent('Generated');
      expect(screen.getByTestId('csv-preview')).toHaveTextContent('Clinical Competency Calculator - Student Report');
      expect(screen.getByTestId('csv-preview')).toHaveTextContent(dbFixture.studentName);
    });
  });
});
