import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockUseUser = jest.fn();
const mockUseRequireRole = jest.fn();
const mockFrom = jest.fn();
const mockGetEPAKFDescs = jest.fn();
const mockGroupKfDescriptions = jest.fn();
const mockGetReportTimeWindowMonths = jest.fn();
const mockFormatReportTimeWindowLabel = jest.fn();

jest.mock('@/context/UserContext', () => ({
  useUser: () => mockUseUser(),
}));

jest.mock('@/utils/useRequiredRole', () => ({
  useRequireRole: (...args: unknown[]) => mockUseRequireRole(...args),
}));

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

jest.mock('@/utils/get-epa-data', () => ({
  getEPAKFDescs: () => mockGetEPAKFDescs(),
}));

jest.mock('@/utils/report-response', () => ({
  groupKfDescriptions: (...args: unknown[]) => mockGroupKfDescriptions(...args),
}));

jest.mock('@/utils/epa-scoring', () => ({
  formatReportTimeWindowLabel: (...args: unknown[]) => mockFormatReportTimeWindowLabel(...args),
  getReportTimeWindowMonths: (...args: unknown[]) => mockGetReportTimeWindowMonths(...args),
}));

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => (props: any) => (
    <div data-testid={`epa-box-${props.epaId}`}>
      EPA {props.epaId} / range {props.timeRange}
    </div>
  ),
}));

jest.mock('@/components/(StudentComponents)/PrintPDFButton', () => ({
  __esModule: true,
  default: (props: any) => (
    <button data-testid='download-pdf'>pdf {props.reportId}</button>
  ),
}));

jest.mock('@/components/(StudentComponents)/ReportGenerationForm', () => ({
  __esModule: true,
  default: ({ onGenerated }: { onGenerated: () => void }) => (
    <button data-testid='generate-report' onClick={onGenerated}>Generate</button>
  ),
}));

import StudentReportPage, {
  getDisplayReportTitle,
  retryAllSummariesForReport,
} from '@/app/dashboard/student/report/page';

type ReportRow = {
  id: string;
  user_id: string;
  title: string;
  time_window: string;
  report_data: Record<string, number>;
  llm_feedback: string | null;
  created_at: string;
};

function setupSupabase({ reports = [] as ReportRow[] | null } = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'student_reports') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ data: reports, error: null })),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      };
    }
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    };
  });
}

describe('student report page coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockUseUser.mockReturnValue({
      user: { id: 'stu-1' },
      displayName: 'Student One',
    });

    mockFormatReportTimeWindowLabel.mockImplementation((v: string) => `Window ${v}`);
    mockGetReportTimeWindowMonths.mockImplementation((v: string) =>
      v.includes('3') ? 3 : v.includes('6') ? 6 : 12
    );
    mockGetEPAKFDescs.mockResolvedValue({
      kf_desc: { '1-1': 'KF one' },
    });
    mockGroupKfDescriptions.mockReturnValue({ '1': ['KF one'] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('covers report title normalization helper edge cases', () => {
    expect(getDisplayReportTitle('  Title (3m) ')).toBe('Title');
    expect(getDisplayReportTitle('No suffix')).toBe('No suffix');
    expect(getDisplayReportTitle('   ')).toBe('   ');
    expect(getDisplayReportTitle('(3m)')).toBe('(3m)');
  });

  it('covers retry-all helper for missing and existing report IDs', async () => {
    const update = jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
    }));
    const from = jest.fn(() => ({ update }));
    const fakeSupabase = { from } as any;

    await retryAllSummariesForReport(fakeSupabase, null);
    expect(from).not.toHaveBeenCalled();

    await retryAllSummariesForReport(fakeSupabase, 'r-123');
    expect(from).toHaveBeenCalledWith('student_reports');
    expect(update).toHaveBeenCalledWith({ llm_feedback: 'Generating...' });
  });

  it('shows loading reports spinner and then empty reports alert', async () => {
    setupSupabase({ reports: [] });

    render(<StudentReportPage />);

    expect(mockUseRequireRole).toHaveBeenCalledWith(['student', 'dev']);
    expect(screen.getByText('Past Reports')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/No reports have been generated yet/i)).toBeInTheDocument();
    });
  });

  it('renders report list, supports search and time filter, and shows no-match state', async () => {
    setupSupabase({
      reports: [
        {
          id: 'r-1',
          user_id: 'stu-1',
          title: 'Report Alpha (3m)',
          time_window: '3m',
          report_data: {},
          llm_feedback: null,
          created_at: '2026-04-10T00:00:00.000Z',
        },
      ],
    });

    render(<StudentReportPage />);

    await waitFor(() => {
      expect(screen.getByText(/Report Alpha/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search reports by name'), {
      target: { value: 'zzz-no-match' },
    });

    await waitFor(() => {
      expect(screen.getByText(/No reports match the current filters/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Last 3 mo' }));
    expect(screen.getByRole('button', { name: 'Last 3 mo' })).toHaveClass('active');
  });

  it('handles report selection, retry all summaries, and renders all EPA boxes', async () => {
    setupSupabase({
      reports: [
        {
          id: 'r-1',
          user_id: 'stu-1',
          title: 'Report Beta (12m)',
          time_window: '12m',
          report_data: {},
          llm_feedback: '{"1":"feedback"}',
          created_at: '2026-04-11T00:00:00.000Z',
        },
      ],
    });

    render(<StudentReportPage />);

    await waitFor(() => {
      expect(screen.getByText(/Report Beta/)).toBeInTheDocument();
    });

    const reportTitleNodes = screen.getAllByText(/Report Beta/);
    const initialRow = reportTitleNodes[0].closest('li');
    expect(initialRow).not.toBeNull();
    expect(initialRow).not.toHaveClass('active');

    fireEvent.click(reportTitleNodes[0]);

    act(() => {
      jest.advanceTimersByTime(450);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Retry All Summaries/i })).toBeInTheDocument();
    });

    const selectedRow = screen.getAllByText(/Report Beta/)[0].closest('li');
    expect(selectedRow).not.toBeNull();
    expect(selectedRow).toHaveClass('active');

    fireEvent.click(screen.getByRole('button', { name: /Retry All Summaries/i }));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('student_reports');
      expect(screen.getByTestId('download-pdf')).toHaveTextContent('r-1');
    });

    expect(screen.getByText('Student One')).toBeInTheDocument();
    expect(screen.getByTestId('epa-box-1')).toBeInTheDocument();
    expect(screen.getByTestId('epa-box-13')).toBeInTheDocument();
  });

  it('triggers onGenerated callback to re-fetch reports', async () => {
    setupSupabase({ reports: [] });

    render(<StudentReportPage />);

    await waitFor(() => {
      expect(screen.getByTestId('generate-report')).toBeInTheDocument();
    });

    const beforeCalls = mockFrom.mock.calls.filter((c) => c[0] === 'student_reports').length;
    fireEvent.click(screen.getByTestId('generate-report'));

    await waitFor(() => {
      const afterCalls = mockFrom.mock.calls.filter((c) => c[0] === 'student_reports').length;
      expect(afterCalls).toBeGreaterThan(beforeCalls);
    });
  });

  it('does not render generation form or fetch reports when user is missing', async () => {
    mockUseUser.mockReturnValue({
      user: undefined,
      displayName: '',
    });
    setupSupabase({ reports: [] });

    render(<StudentReportPage />);

    expect(screen.queryByTestId('generate-report')).toBeNull();
    expect(screen.getByRole('status')).toBeInTheDocument();

    await waitFor(() => {
      const reportCalls = mockFrom.mock.calls.filter((c) => c[0] === 'student_reports').length;
      expect(reportCalls).toBe(0);
    });
  });

  it('handles missing and null kf descriptions and title edge cases', async () => {
    mockGetEPAKFDescs
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(null);

    setupSupabase({
      reports: [
        {
          id: 'r-edge-1',
          user_id: 'stu-1',
          title: '(3m)',
          time_window: '3m',
          report_data: {},
          llm_feedback: null,
          created_at: '2026-04-12T00:00:00.000Z',
        },
        {
          id: 'r-edge-2',
          user_id: 'stu-1',
          title: '  Plain Report  ',
          time_window: '6m',
          report_data: {},
          llm_feedback: null,
          created_at: '2026-04-11T00:00:00.000Z',
        },
      ],
    });

    const { rerender } = render(<StudentReportPage />);

    await waitFor(() => {
      expect(screen.getByText(/Plain Report/)).toBeInTheDocument();
      expect(screen.getByText(/\(3m\)/)).toBeInTheDocument();
    });

    rerender(<StudentReportPage />);

    expect(mockGroupKfDescriptions).not.toHaveBeenCalled();
  });

  it('handles null reports data from supabase fallback', async () => {
    setupSupabase({ reports: null });

    render(<StudentReportPage />);

    await waitFor(() => {
      expect(screen.getByText(/No reports have been generated yet/i)).toBeInTheDocument();
    });
  });
});
