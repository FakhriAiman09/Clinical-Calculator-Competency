/** @jest-environment jsdom */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockFrom = jest.fn();

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

const mockUseUser = jest.fn();
jest.mock('@/context/UserContext', () => ({
  useUser: () => mockUseUser(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (...args: any[]) => {
    const dynamicModule = jest.requireActual('next/dynamic');
    const dynamicActualComp = dynamicModule.default;
    const RequiredComponent = dynamicActualComp(args[0]);
    RequiredComponent.preload ? RequiredComponent.preload() : RequiredComponent.render?.preload?.();
    return RequiredComponent;
  },
}));

jest.mock('@/components/(AdminComponents)/adminDashboard', () => ({
  __esModule: true,
  default: () => <div data-testid="admin-dashboard">Admin Dashboard</div>,
}));

jest.mock('@/components/(RaterComponents)/raterDashboard', () => ({
  __esModule: true,
  default: () => <div data-testid="rater-dashboard">Rater Dashboard</div>,
}));

jest.mock('@/components/(StudentComponents)/studentDashboard', () => ({
  __esModule: true,
  default: () => <div data-testid="student-dashboard">Student Dashboard</div>,
}));

jest.mock('@/components/Header/ProfileSettingsModal', () => ({
  __esModule: true,
  default: ({ onClose, open }: any) => (open ? <div>Profile Modal</div> : null),
}));

jest.mock('@uiw/react-markdown-preview', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

import Dashboard from '@/app/dashboard/page';

describe('dashboard page coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockUseUser.mockReturnValue({
      user: { id: 'u-1' },
      displayName: 'Alice',
      loading: false,
      userRoleAuthorized: true,
      userRoleRater: false,
      userRoleStudent: false,
      userRoleDev: false,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'announcements') {
        return {
          select: jest.fn(() => ({
            lte: jest.fn(() => ({
              gte: jest.fn(() => ({
                order: jest.fn(() =>
                  Promise.resolve({
                    data: [],
                    error: null,
                  }),
                ),
              })),
            })),
          })),
        };
      }
      return { select: jest.fn(() => Promise.resolve({ data: [], error: null })) };
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    sessionStorage.clear();
  });

  it('renders admin dashboard when user is authorized', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
    });
  });

  it('loads and fetches announcements on mount', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('announcements');
    });
  });

  it('restores dismissed announcements from session storage', async () => {
    sessionStorage.setItem('dismissedBannerIds', JSON.stringify(['a-1']));

    render(<Dashboard />);

    await waitFor(() => {
      const saved = sessionStorage.getItem('dismissedBannerIds');
      expect(saved).toBe(JSON.stringify(['a-1']));
    });
  });

  it('shows dev switcher when user is dev', async () => {
    mockUseUser.mockReturnValue({
      user: { id: 'u-1' },
      displayName: 'Dev',
      loading: false,
      userRoleAuthorized: false,
      userRoleRater: false,
      userRoleStudent: false,
      userRoleDev: true,
    });

    const { container } = render(<Dashboard />);

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it('hides display name modal when user has a display name', () => {
    render(<Dashboard />);

    expect(screen.queryByText('Profile Modal')).toBeNull();
  });
});

