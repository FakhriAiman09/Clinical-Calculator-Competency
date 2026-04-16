import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/components/(AdminComponents)/AdminAnnouncements', () => ({
  __esModule: true,
  default: () => <div data-testid='admin-announcements-mock' />,
}));

jest.mock('@/components/(AdminComponents)/AdminSettingsButtons', () => ({
  __esModule: true,
  default: () => <div data-testid='admin-settings-buttons-mock' />,
}));

jest.mock('@/components/(AdminComponents)/StatsTabsClient', () => ({
  __esModule: true,
  default: () => <div data-testid='stats-tabs-client-mock' />,
}));

jest.mock('bootstrap', () => ({}));

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => undefined,
}));

jest.mock('@/components/(StudentComponents)/LineGraph', () => ({
  __esModule: true,
  default: ({ data }: { data: Array<{ date: string; value: number }> }) => (
    <div data-testid='line-graph-mock'>points:{data.length}</div>
  ),
}));

jest.mock('@/app/demo/_components/DemoHalfCircleGauge', () => ({
  __esModule: true,
  default: ({ average, allGreen }: { average: number | null; allGreen: boolean }) => (
    <div data-testid='half-circle-gauge-mock'>avg:{String(average)};green:{String(allGreen)}</div>
  ),
}));

import AdminDashboardPage from '@/components/(AdminComponents)/adminDashboard';
import BootstrapClient from '@/components/bootstrap-client';
import DemoEPABox from '@/app/demo/_components/DemoEPABox';
import DemoLineGraph from '@/app/demo/_components/DemoLineGraph';

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@/utils/supabase/server';
import { supabase_authorize } from '@/utils/async-util';

describe('coverage quick wins', () => {
  test('adminDashboard renders all child sections', () => {
    render(<AdminDashboardPage />);

    expect(screen.getByTestId('stats-tabs-client-mock')).toBeInTheDocument();
    expect(screen.getByTestId('admin-settings-buttons-mock')).toBeInTheDocument();
    expect(screen.getByTestId('admin-announcements-mock')).toBeInTheDocument();
  });

  test('bootstrap-client renders nothing', () => {
    const { container } = render(<BootstrapClient />);
    expect(container.firstChild).toBeNull();
  });

  test('demo line graph forwards data prop', () => {
    render(<DemoLineGraph data={[{ date: '2026-01-01', value: 2 }]} />);
    expect(screen.getByTestId('line-graph-mock')).toHaveTextContent('points:1');
  });

  test('demo epa box toggles expansion and renders feedback when present', () => {
    const onEditClick = jest.fn();

    render(
      <DemoEPABox
        epaId={1}
        kfAvgData={{ '1.1': 2, '1.2': 3 }}
        llmFeedback={JSON.stringify({ '1.1': 'Feedback A', '1.2': 'Feedback B' })}
        formResults={[
          { response_id: 'r1', created_at: '2026-03-01T00:00:00Z', rater_name: 'A', rater_email: 'a@a.com', results: { '1.1': 2, '1.2': 3 } },
          { response_id: 'r2', created_at: '2026-04-01T00:00:00Z', rater_name: 'B', rater_email: 'b@b.com', results: { '1.1': 3, '1.2': 3 } },
        ]}
        reportCreatedAt='2026-04-15T00:00:00Z'
        timeRange={3}
        check={{ totalComments: 2, flaggedComments: 1, topReason: 'Low quality' }}
        onEditClick={onEditClick}
      />,
    );

    expect(screen.getByText(/flagged/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /EPA 1/i })[0]);

    expect(screen.getByTestId('half-circle-gauge-mock')).toBeInTheDocument();
    expect(screen.getByText(/AI-Generated Feedback/i)).toBeInTheDocument();
    expect(screen.getByText(/Assessment trend/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Edit EPA 1/i }));
    expect(onEditClick).toHaveBeenCalledTimes(1);
  });

  test('demo epa box shows no feedback message when absent', () => {
    render(
      <DemoEPABox
        epaId={1}
        kfAvgData={{ '1.1': 1 }}
        llmFeedback=''
        formResults={[]}
        reportCreatedAt='2026-04-15T00:00:00Z'
        timeRange={3}
        onEditClick={() => undefined}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /EPA 1/i })[0]);
    expect(screen.getByText(/No AI feedback available for this EPA/i)).toBeInTheDocument();
  });
});

describe('supabase_authorize', () => {
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns true when all permissions are authorized', async () => {
    const rpc = jest.fn(async () => ({ data: true, error: null }));
    const schema = jest.fn(() => ({ rpc }));
    mockCreateClient.mockResolvedValue({ schema } as never);

    await expect(supabase_authorize(['read', 'write'])).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  test('returns false when rpc returns an error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const rpc = jest
      .fn()
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('auth failed') });
    const schema = jest.fn(() => ({ rpc }));
    mockCreateClient.mockResolvedValue({ schema } as never);

    await expect(supabase_authorize(['read', 'write'])).resolves.toBe(false);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test('returns false when rpc returns no data', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const rpc = jest.fn(async () => ({ data: null, error: null }));
    const schema = jest.fn(() => ({ rpc }));
    mockCreateClient.mockResolvedValue({ schema } as never);

    await expect(supabase_authorize(['read'])).resolves.toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching user permissions: No data returned');

    consoleSpy.mockRestore();
  });
});
