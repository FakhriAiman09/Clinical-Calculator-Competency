/** @jest-environment node */

import { GET } from '@/app/api/generate-csv/route';

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import { createClient } from '@/utils/supabase/server';

const createClientMock = createClient as jest.Mock;

describe('Functional requirement: CSV export route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 400 when required query parameters are missing', async () => {
    const response = await GET(new Request('http://localhost/api/generate-csv') as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'Missing studentId or reportId' });
  });

  test('returns downloadable CSV when report data exists', async () => {
    const mockClient = {
      from: jest.fn((table: string) => {
        if (table === 'student_reports') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn(async () => ({
                    data: {
                      id: 'rep-1',
                      user_id: 'stu-1',
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
                  data: { display_name: 'Student One' },
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
    };

    createClientMock.mockResolvedValue(mockClient);

    const response = await GET(
      new Request('http://localhost/api/generate-csv?studentId=stu-1&reportId=rep-1') as never
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/csv');
    expect(response.headers.get('Content-Disposition')).toContain('.csv');

    const body = await response.text();
    expect(body).toContain('Clinical Competency Calculator - Student Report');
    expect(body).toContain('Student One');
    expect(body).toContain('--- AI FEEDBACK ---');
  });
});
