import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const getSearchParamMock = jest.fn();
const mockFrom = jest.fn();

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => ({ get: (key: string) => getSearchParamMock(key) })),
}));

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}));

jest.mock('@/utils/get-epa-data', () => ({
  getEPAKFDescs: jest.fn().mockResolvedValue({
    kf_desc: [{ epa: 1, kf: 'KF 1' }],
    epa_desc: { '1': 'EPA One Title', '2': 'EPA Two Title' },
  }),
}));

jest.mock('@/utils/report-response', () => ({
  groupKfDescriptions: jest.fn(() => ({ '1': ['KF one description'] })),
}));

jest.mock('@/utils/useRequiredRole', () => ({ useRequireRole: jest.fn() }));

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid='markdown'>{children}</div>,
}));

jest.mock('remark-gfm', () => ({ __esModule: true, default: jest.fn() }));

jest.mock('@/utils/epa-scoring', () => ({
  DEV_LEVEL_LABELS: ['Remedial', 'Early-Developing', 'Developing', 'Entrustable'],
  formatReportTimeWindowLabel: jest.fn((v: string) => `Window ${v}`),
  getEpaLevelFromScores: jest.fn((scores: number[]) => (scores.length ? 2 : null)),
  getReportTimeWindowMonths: jest.fn(() => 3),
}));

jest.mock('@/utils/report-feedback', () => ({
  parseFeedbackObject: jest.fn((value: string | null) => value),
  getRelevantFeedbackMarkdown: jest.fn((value: string | null, epaId: number) =>
    value && epaId === 1 ? 'AI feedback for EPA 1' : null,
  ),
}));

import PrintReportPage, { annotateScores, sanitize } from '@/app/dashboard/print-report/page';

type MockStudent = { id: string; display_name: string | null };
type MockReport = {
  id: string;
  user_id: string;
  title: string;
  time_window: string;
  report_data: Record<string, number>;
  kf_avg_data: Record<string, number> | null;
  llm_feedback: string | null;
  created_at: string;
};

function setupSupabase({
  roles = [{ user_id: 'stu-1' }],
  profiles = [{ id: 'stu-1', display_name: 'Student One' }],
  reports = [{
    id: 'rep-1',
    user_id: 'stu-1',
    title: 'Report Title',
    time_window: '3m',
    report_data: { '1.1': 2 },
    kf_avg_data: { '1.1': 2.4 },
    llm_feedback: '{"1":"feedback"}',
    created_at: '2026-04-10T00:00:00.000Z',
  }] as MockReport[],
  formResults = [{
    created_at: '2026-04-01T00:00:00.000Z',
    results: { '1.1': 2 },
    form_responses: {
      response: { response: { '1': { kf1: { text: ['great comment', 'x'] } } } },
      form_requests: { student_id: 'stu-1', clinical_settings: 'Clinic' },
    },
  }],
}: {
  roles?: Array<{ user_id: string }>;
  profiles?: MockStudent[];
  reports?: MockReport[];
  formResults?: unknown[];
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'user_roles') {
      return { select: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: roles, error: null })) })) };
    }
    if (table === 'profiles') {
      return {
        select: jest.fn(() => ({
          in: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: profiles, error: null })) })),
          eq: jest.fn(() => ({ single: jest.fn(() => Promise.resolve({ data: profiles[0] ?? null, error: null })) })),
        })),
      };
    }
    if (table === 'student_reports') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ data: reports, error: null })),
            single: jest.fn(() => Promise.resolve({ data: reports[0] ?? null, error: null })),
          })),
        })),
      };
    }
    if (table === 'form_results') {
      return {
        select: jest.fn(() => ({
          returns: jest.fn(() => Promise.resolve({ data: formResults, error: null })),
        })),
      };
    }
    return { select: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: [], error: null })) })) };
  });
}

describe('print-report page coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSearchParamMock.mockReturnValue(null);
    setupSupabase();
  });

  it('annotateScores appends level labels to decimal scores', () => {
    expect(annotateScores('Score 2.0625 today')).toContain('(Developing)');
    expect(annotateScores('Outside 9.99 range')).toBe('Outside 9.99 range');
  });

  it('sanitize strips quotes, commas, and duplicates quotes', () => {
    expect(sanitize('"Hello",,')).toBe('"Hello"');
    expect(sanitize('')).toBe('');
    expect(sanitize('""Quoted""')).toBe('"Quoted"');
  });

  it('renders selector UI and populates report choices from manual selection', async () => {
    render(<PrintReportPage />);

    await waitFor(() => {
      expect(screen.getByText('Generate PDF Report')).toBeInTheDocument();
      expect(screen.getByText('Student One')).toBeInTheDocument();
    });

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'stu-1' } });
    await waitFor(() => expect(screen.getByText(/Report Title/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByRole('combobox').length).toBeGreaterThan(1));

    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'rep-1' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Build Report' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Build Report' })).toBeEnabled();
  });

  it('auto-loads report from query params and shows loading state first', async () => {
    getSearchParamMock.mockImplementation((key: string) => {
      if (key === 'studentId') return 'stu-1';
      if (key === 'reportId') return 'rep-1';
      if (key === 'from') return '/dashboard/admin/all-reports';
      return null;
    });

    render(<PrintReportPage />);
    expect(screen.getByText('Building report…')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('EPA Summary')).toBeInTheDocument();
      expect(screen.getByText('Print PDF')).toBeInTheDocument();
    });
  });

  it('handles missing auto-load profile or report by staying on loading/selector path', async () => {
    getSearchParamMock.mockImplementation((key: string) => {
      if (key === 'studentId') return 'stu-x';
      if (key === 'reportId') return 'rep-x';
      return null;
    });
    setupSupabase({ profiles: [], reports: [] });

    render(<PrintReportPage />);
    expect(screen.getByText('Building report…')).toBeInTheDocument();
  });

  it('uses back and print toolbar actions', async () => {
    const printMock = jest.fn();
    Object.defineProperty(window, 'print', { configurable: true, value: printMock });
    const locationRef = { href: '' };
    Object.defineProperty(window, 'location', { configurable: true, value: locationRef });
    getSearchParamMock.mockImplementation((key: string) => {
      if (key === 'studentId') return 'stu-1';
      if (key === 'reportId') return 'rep-1';
      if (key === 'from') return '/custom-back';
      return null;
    });

    render(<PrintReportPage />);
    await waitFor(() => expect(screen.getByText('Print PDF')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Print PDF'));
    expect(printMock).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Back'));
    expect(locationRef.href).toBe('/custom-back');
  });

  it('omits comments block when only short or blank comments exist', async () => {
    getSearchParamMock.mockImplementation((key: string) => {
      if (key === 'studentId') return 'stu-1';
      if (key === 'reportId') return 'rep-1';
      return null;
    });
    setupSupabase({
      formResults: [{
        created_at: '2026-04-01T00:00:00.000Z',
        results: { '1.1': 2 },
        form_responses: {
          response: { response: { '1': { kf1: { text: ['x', '  '] } } } },
          form_requests: { student_id: 'stu-1', clinical_settings: 'Clinic' },
        },
      }],
    });

    render(<PrintReportPage />);
    await waitFor(() => expect(screen.getByText('EPA Summary')).toBeInTheDocument());
    expect(screen.queryByText('great comment')).toBeNull();
  });
});