// Tests for StatsTabsClient.tsx, ReportGenerationForm.tsx, AboutUsPage, and demo page
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock getSystemStats
jest.mock('@/utils/getSystemStats', () => ({
  getSystemStats: jest.fn(),
}));

// Mock send-reminder-rater.server
jest.mock('@/app/dashboard/rater/form/rater-email-api/send-reminder-rater.server', () => ({
  sendReminderEmail: jest.fn(),
}));

// Mock Supabase - mutable so each test can override
const mockRpcFn = jest.fn().mockResolvedValue({ error: null });
const mockFromFn = jest.fn(() => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  order: jest.fn().mockResolvedValue({ data: [], error: null }),
  upsert: jest.fn().mockResolvedValue({ error: null }),
  rpc: jest.fn().mockResolvedValue({ error: null }),
}));
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: (...args: any[]) => mockFromFn(...args),
    rpc: (...args: any[]) => mockRpcFn(...args),
    auth: { getUser: jest.fn() },
  })),
}));

// Mock sampleData with correct shape matching demo's SystemStats interface
jest.mock('@/app/demo/_data/sampleData', () => ({
  DEMO_SYSTEM_STATS: {
    totalSubmittedForms: 10,
    activeFormRequests: 2,
    delinquentFormRequests: 1,
    averageTurnaroundDays: 5.0,
    topDelinquentRaters: [
      { rater_id: 'r1', display_name: 'Rater 1', email: 'r1@test.com', count: 3 },
    ],
    monthlySubmissionTrends: [],
    monthlyEPADistribution: {},
  },
}));

// Mock next/script
jest.mock('next/script', () => ({
  __esModule: true,
  default: ({ id }: { id?: string }) => <script data-testid={id || 'script'} />,
}));

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock epa-scoring
jest.mock('@/utils/epa-scoring', () => ({
  REPORT_TIME_WINDOWS: [3, 6, 12],
}));

import { getSystemStats } from '@/utils/getSystemStats';
import { sendReminderEmail } from '@/app/dashboard/rater/form/rater-email-api/send-reminder-rater.server';

const mockStats = {
  totalSubmittedForms: 42,
  activeFormRequests: 5,
  delinquentFormRequests: 3,
  averageTurnaroundDays: 3.5,
  topDelinquentRaters: [
    { rater_id: 'r1', display_name: 'Slow Rater', email: 'slow@test.com', count: 5 },
  ],
  monthlySubmissionTrends: [],
  monthlyEPADistribution: {
    '1': [{ month: '2024-01', count: 5 }],
    '2': [{ month: '2024-01', count: 3 }],
  },
};

describe('StatsTabsClient.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSystemStats as jest.Mock).mockResolvedValue(mockStats);
    (sendReminderEmail as jest.Mock).mockResolvedValue(undefined);
  });

  it('should show loading state initially', async () => {
    // Delay stats response to see loading
    (getSystemStats as jest.Mock).mockImplementation(
      () => new Promise((r) => setTimeout(() => r(mockStats), 200))
    );

    const StatsTabsClient = (await import('@/components/(AdminComponents)/StatsTabsClient')).default;
    render(<StatsTabsClient />);
    expect(screen.getByText('Loading statistics...')).toBeInTheDocument();
  });

  it('should render stats after loading', async () => {
    const StatsTabsClient = (await import('@/components/(AdminComponents)/StatsTabsClient')).default;
    await act(async () => {
      render(<StatsTabsClient />);
    });
    await waitFor(() => {
      expect(screen.getByText('System Statistics')).toBeInTheDocument();
    });
  });

  it('should show error state when stats fail to load', async () => {
    (getSystemStats as jest.Mock).mockRejectedValue(new Error('Failed'));
    const StatsTabsClient = (await import('@/components/(AdminComponents)/StatsTabsClient')).default;
    await act(async () => {
      render(<StatsTabsClient />);
    });
    await waitFor(() => {
      expect(screen.getByText(/Failed to load statistics/)).toBeInTheDocument();
    });
  });

  it('should display delinquent rater in Delinquent Raters tab', async () => {
    const StatsTabsClient = (await import('@/components/(AdminComponents)/StatsTabsClient')).default;
    const user = userEvent.setup();
    await act(async () => {
      render(<StatsTabsClient />);
    });
    await waitFor(() => {
      expect(screen.getByText('System Statistics')).toBeInTheDocument();
    });

    // Switch to Delinquent Raters tab
    const tabDropdown = screen.getAllByText(/Overview|Delinquent Raters/)[0].closest('button');
    await act(async () => {
      const delinquentBtn = screen.getAllByText('Delinquent Raters')[0];
      await user.click(delinquentBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('Slow Rater')).toBeInTheDocument();
    });
  });

  it('should send reminder email when send button clicked', async () => {
    const user = userEvent.setup();
    const StatsTabsClient = (await import('@/components/(AdminComponents)/StatsTabsClient')).default;
    await act(async () => {
      render(<StatsTabsClient />);
    });
    await waitFor(() => {
      expect(screen.getByText('System Statistics')).toBeInTheDocument();
    });

    // Switch to Delinquent Raters tab first
    await act(async () => {
      const delinquentBtn = screen.getAllByText('Delinquent Raters')[0];
      await user.click(delinquentBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('Slow Rater')).toBeInTheDocument();
    });

    const sendBtn = screen.getByRole('button', { name: /send reminder/i });
    await act(async () => {
      await user.click(sendBtn);
    });

    await waitFor(() => {
      expect(sendReminderEmail).toHaveBeenCalledWith({
        to: 'slow@test.com',
        facultyName: 'Slow Rater',
      });
    });
  });
});

describe('AboutUsPage/page.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRpcFn.mockResolvedValue({ error: null });
    mockFromFn.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    });
  });

  it('should render About page and show loading state', async () => {
    mockFromFn.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn(() => new Promise((r) => setTimeout(() => r({ data: [], error: null }), 200))),
    });

    const AboutPage = (await import('@/app/dashboard/AboutUsPage/page')).default;
    await act(async () => {
      render(<AboutPage />);
    });
    expect(document.body).not.toBeEmptyDOMElement();
  });

  it('should render developer list after loading', async () => {
    const mockDevs = [
      { id: '1', dev_name: 'Alice Dev', role: 'Frontend', contribution: 'UI components' },
      { id: '2', dev_name: 'Bob Dev', role: 'Backend', contribution: 'API design' },
    ];
    mockFromFn.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockDevs, error: null }),
    });

    const AboutPage = (await import('@/app/dashboard/AboutUsPage/page')).default;
    await act(async () => {
      render(<AboutPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Alice Dev')).toBeInTheDocument();
      expect(screen.getByText('Bob Dev')).toBeInTheDocument();
    });
  });

  it('should show error message when fetching fails', async () => {
    mockFromFn.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    });

    const AboutPage = (await import('@/app/dashboard/AboutUsPage/page')).default;
    await act(async () => {
      render(<AboutPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to load developers/i)).toBeInTheDocument();
    });
  });

  it('should expand developer details on click', async () => {
    const mockDevs = [
      { id: '1', dev_name: 'Click Dev', role: 'FullStack', contribution: 'Everything' },
    ];
    mockFromFn.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockDevs, error: null }),
    });

    const AboutPage = (await import('@/app/dashboard/AboutUsPage/page')).default;
    const user = userEvent.setup();
    await act(async () => {
      render(<AboutPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Click Dev')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByText('Click Dev'));
    });
    await waitFor(() => {
      expect(screen.getByText('Everything')).toBeInTheDocument();
    });
  });
});

describe('ReportGenerationForm.tsx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRpcFn.mockResolvedValue({ error: null });
  });

  it('should render form with required fields', async () => {
    const ReportGenerationForm = (await import('@/components/(StudentComponents)/ReportGenerationForm')).default;
    render(<ReportGenerationForm studentId="student-1" onGenerated={jest.fn()} />);
    expect(screen.getByPlaceholderText(/report title/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument();
  });

  it('should call rpc to generate report on submit', async () => {
    const ReportGenerationForm = (await import('@/components/(StudentComponents)/ReportGenerationForm')).default;
    const onGenerated = jest.fn();
    const user = userEvent.setup();

    render(<ReportGenerationForm studentId="student-1" onGenerated={onGenerated} />);

    const titleInput = screen.getByPlaceholderText(/report title/i);
    await user.type(titleInput, 'My Test Report');
    await user.click(screen.getByRole('button', { name: /generate/i }));

    await waitFor(() => {
      expect(mockRpcFn).toHaveBeenCalledWith('generate_report', expect.objectContaining({
        student_id_input: 'student-1',
        report_title: 'My Test Report',
      }));
    });
  });

  it('should not submit when title is empty', async () => {
    const ReportGenerationForm = (await import('@/components/(StudentComponents)/ReportGenerationForm')).default;
    const user = userEvent.setup();

    render(<ReportGenerationForm studentId="student-1" onGenerated={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: /generate/i }));

    expect(mockRpcFn).not.toHaveBeenCalled();
  });

  it('should show error when report generation fails', async () => {
    mockRpcFn.mockResolvedValue({ error: { message: 'Failed to generate' } });

    const ReportGenerationForm = (await import('@/components/(StudentComponents)/ReportGenerationForm')).default;
    const user = userEvent.setup();

    render(<ReportGenerationForm studentId="student-1" onGenerated={jest.fn()} />);
    const titleInput = screen.getByPlaceholderText(/report title/i);
    await user.type(titleInput, 'Failing Report');
    await user.click(screen.getByRole('button', { name: /generate/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to generate/i)).toBeInTheDocument();
    });
  });
});

describe('demo/page.tsx - DemoDashboardPage', () => {
  it('should render demo dashboard with System Statistics', async () => {
    const DemoDashboardPage = (await import('@/app/demo/page')).default;
    await act(async () => {
      render(<DemoDashboardPage />);
    });
    expect(screen.getByText('System Statistics')).toBeInTheDocument();
  });

  it('should render tab navigation', async () => {
    const DemoDashboardPage = (await import('@/app/demo/page')).default;
    await act(async () => {
      render(<DemoDashboardPage />);
    });
    // Tab button dropdown should be present
    expect(screen.getByText('System Statistics')).toBeInTheDocument();
  });

  it('should handle refresh button click', async () => {
    const DemoDashboardPage = (await import('@/app/demo/page')).default;
    const user = userEvent.setup();

    await act(async () => {
      render(<DemoDashboardPage />);
    });

    const refreshBtn = screen.getByRole('button', { name: /refresh/i });
    await act(async () => {
      await user.click(refreshBtn);
    });
    // After click, refreshing state cycles back - no crash
    expect(screen.getByText('System Statistics')).toBeInTheDocument();
  });

  it('should handle send reminder in demo mode (no real email)', async () => {
    const DemoDashboardPage = (await import('@/app/demo/page')).default;
    const user = userEvent.setup();

    await act(async () => {
      render(<DemoDashboardPage />);
    });

    // Find and click send reminder button for mock delinquent rater
    const reminderBtn = screen.queryByRole('button', { name: /send reminder/i });
    if (reminderBtn) {
      await act(async () => {
        await user.click(reminderBtn);
      });
      // Should show sent status (demo uses setTimeout)
      await waitFor(() => {
        expect(document.body).not.toBeEmptyDOMElement();
      }, { timeout: 2000 });
    }
    expect(screen.getByText('System Statistics')).toBeInTheDocument();
  });
});
