/** @jest-environment jsdom */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockSetTheme = jest.fn();
const mockUseTheme = jest.fn();
const mockUseUser = jest.fn();
const mockCreateClient = jest.fn();

jest.mock('@/context/ThemeContext', () => ({
  useTheme: () => mockUseTheme(),
}));

jest.mock('@/context/UserContext', () => ({
  useUser: () => mockUseUser(),
}));

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => mockCreateClient(),
}));

jest.mock('@/components/AIPreferencesSection', () => ({
  __esModule: true,
  default: () => <div data-testid='ai-prefs'>AI Preferences Section</div>,
}));

import SettingsPage from '@/app/dashboard/settings/page';
import PrintPDFButton from '@/components/(StudentComponents)/PrintPDFButton';

describe('settings page coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockSetTheme.mockResolvedValue(undefined);

    mockUseTheme.mockReturnValue({
      theme: 'auto',
      setTheme: mockSetTheme,
      resolvedTheme: 'dark',
    });

    mockUseUser.mockReturnValue({
      user: { id: 'u-1' },
      displayName: 'Alice',
      email: 'alice@example.com',
      userRoleRater: true,
      userRoleDev: false,
    });

    mockCreateClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            update: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({ error: null })),
            })),
          };
        }
        return { update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) })) };
      }),
      auth: {
        resetPasswordForEmail: jest.fn(() => Promise.resolve({ error: null })),
      },
    });

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        origin: 'http://localhost:3000',
        reload: jest.fn(),
        href: '',
      },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders settings sections and rater/dev AI preferences', async () => {
    render(<SettingsPage />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByTestId('ai-prefs')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Theme')).toBeInTheDocument();
      expect(screen.getByText(/currently displaying/i)).toBeInTheDocument();
    });
  });

  it('changes theme and shows a saved toast', async () => {
    render(<SettingsPage />);

    await waitFor(() => expect(screen.getByRole('button', { name: /dark/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /dark/i }));

    await waitFor(() => {
      expect(mockSetTheme).toHaveBeenCalledWith('dark');
      expect(screen.getByText(/preference saved/i)).toBeInTheDocument();
    });

    jest.advanceTimersByTime(2100);
    await waitFor(() => expect(screen.queryByText(/preference saved/i)).toBeNull());
  });

  it('saves profile display name', async () => {
    render(<SettingsPage />);

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    expect(saveBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: 'Alice Updated' } });
    expect(saveBtn).toBeEnabled();

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  it('sends password reset email and shows success message', async () => {
    render(<SettingsPage />);

    const btn = screen.getByRole('button', { name: /send password reset email/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText(/password reset email sent/i)).toBeInTheDocument();
    });
  });

  it('hides AI preferences for non-rater and non-dev users', () => {
    mockUseUser.mockReturnValue({
      user: { id: 'u-1' },
      displayName: 'Alice',
      email: 'alice@example.com',
      userRoleRater: false,
      userRoleDev: false,
    });

    render(<SettingsPage />);

    expect(screen.queryByTestId('ai-prefs')).toBeNull();
  });
});

describe('PrintPDFButton coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    global.alert = jest.fn();
    global.fetch = jest.fn();
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/dashboard/student/report/r1',
        href: '',
      },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens fallback print route when required params are missing', () => {
    const openMock = jest.fn();
    Object.defineProperty(window, 'open', { configurable: true, value: openMock });

    render(<PrintPDFButton />);

    fireEvent.click(screen.getByRole('button', { name: /view as pdf/i }));

    expect(openMock).toHaveBeenCalledWith('/dashboard/print-report', '_blank');
  });

  it('opens generated print url and resets printing state', async () => {
    const openMock = jest.fn(() => ({}));
    Object.defineProperty(window, 'open', { configurable: true, value: openMock });

    render(<PrintPDFButton studentId='stu-1' reportId='rep-1' reportTitle='Report A' returnUrl='/back' />);

    fireEvent.click(screen.getByRole('button', { name: /view as pdf/i }));

    expect(openMock).toHaveBeenCalledWith(
      '/dashboard/print-report?studentId=stu-1&reportId=rep-1&from=%2Fback',
      '_blank',
    );
    expect(screen.getByText('Opening...')).toBeInTheDocument();

    jest.advanceTimersByTime(4100);
    await waitFor(() => expect(screen.queryByText('Opening...')).toBeNull());
  });

  it('falls back to same-tab navigation when popup is blocked', () => {
    const openMock = jest.fn(() => null);
    Object.defineProperty(window, 'open', { configurable: true, value: openMock });

    render(<PrintPDFButton studentId='stu-1' reportId='rep-1' />);

    fireEvent.click(screen.getByRole('button', { name: /view as pdf/i }));

    expect(window.location.href).toBe('/dashboard/print-report?studentId=stu-1&reportId=rep-1&from=%2Fdashboard%2Fstudent%2Freport%2Fr1');
  });

  it('exports CSV successfully with filename from Content-Disposition', async () => {
    const openMock = jest.fn();
    Object.defineProperty(window, 'open', { configurable: true, value: openMock });

    const appendSpy = jest.spyOn(document.body, 'appendChild');
    const removeSpy = jest.spyOn(document.body, 'removeChild');

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      blob: jest.fn(async () => new Blob(['csv'], { type: 'text/csv' })),
      headers: {
        get: jest.fn(() => 'attachment; filename="report-abc.csv"'),
      },
    });

    render(<PrintPDFButton studentId='stu-1' reportId='abc' />);

    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith('/api/generate-csv?studentId=stu-1&reportId=abc');
    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();

    jest.advanceTimersByTime(61000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('alerts when CSV export fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

    render(<PrintPDFButton studentId='stu-1' reportId='abc' />);

    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('CSV export failed. Please try again.');
    });
  });
});
