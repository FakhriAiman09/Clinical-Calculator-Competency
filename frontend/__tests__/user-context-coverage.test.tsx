import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';

const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockRpc = jest.fn();
const mockFrom = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (callback: (event: string) => void) => mockOnAuthStateChange(callback),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

import { UserProvider, useUser } from '@/context/UserContext';

function ContextProbe() {
  const ctx = useUser();
  return (
    <div>
      <span data-testid='loading'>{String(ctx.loading)}</span>
      <span data-testid='display-name'>{ctx.displayName}</span>
      <span data-testid='email'>{ctx.email}</span>
      <span data-testid='admin'>{String(ctx.userRoleAuthorized)}</span>
      <span data-testid='rater'>{String(ctx.userRoleRater)}</span>
      <span data-testid='student'>{String(ctx.userRoleStudent)}</span>
      <span data-testid='dev'>{String(ctx.userRoleDev)}</span>
      <span data-testid='user-id'>{ctx.user?.id ?? ''}</span>
    </div>
  );
}

describe('UserContext coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: { unsubscribe: mockUnsubscribe },
      },
    });

    const single = jest.fn().mockResolvedValue({ data: { display_name: 'Alice' }, error: null });
    const eq = jest.fn(() => ({ single }));
    const select = jest.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });

    mockRpc.mockResolvedValue({ data: 'admin', error: null });
  });

  it('throws when useUser is used outside provider', () => {
    const BadConsumer = () => {
      useUser();
      return <div>bad</div>;
    };

    expect(() => render(<BadConsumer />)).toThrow('useUser must be used within a UserProvider');
  });

  it('clears state when session is missing', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(
      <UserProvider>
        <ContextProbe />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('user-id')).toHaveTextContent('');
    expect(screen.getByTestId('display-name')).toHaveTextContent('');
    expect(screen.getByTestId('admin')).toHaveTextContent('false');
    expect(screen.getByTestId('rater')).toHaveTextContent('false');
    expect(screen.getByTestId('student')).toHaveTextContent('false');
    expect(screen.getByTestId('dev')).toHaveTextContent('false');
  });

  it('loads profile and admin role for active session', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1', email: 'alice@example.com' },
        },
      },
    });

    render(
      <UserProvider>
        <ContextProbe />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('user-id')).toHaveTextContent('user-1');
    expect(screen.getByTestId('email')).toHaveTextContent('alice@example.com');
    expect(screen.getByTestId('display-name')).toHaveTextContent('Alice');
    expect(screen.getByTestId('admin')).toHaveTextContent('true');
    expect(screen.getByTestId('rater')).toHaveTextContent('false');
    expect(screen.getByTestId('student')).toHaveTextContent('false');
    expect(screen.getByTestId('dev')).toHaveTextContent('false');
  });

  it('handles profile/role errors and keeps safe defaults', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-2', email: 'rater@example.com' },
        },
      },
    });

    const single = jest.fn().mockResolvedValue({ data: null, error: { message: 'profile error' } });
    const eq = jest.fn(() => ({ single }));
    const select = jest.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });
    mockRpc.mockResolvedValue({ data: null, error: { message: 'role error' } });

    render(
      <UserProvider>
        <ContextProbe />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('display-name')).toHaveTextContent('');
    expect(screen.getByTestId('admin')).toHaveTextContent('false');
    expect(screen.getByTestId('rater')).toHaveTextContent('false');
    expect(screen.getByTestId('student')).toHaveTextContent('false');
    expect(screen.getByTestId('dev')).toHaveTextContent('false');
  });

  it('responds to auth events and unsubscribes on unmount', async () => {
    let authCallback: ((event: string) => void) | null = null;

    mockOnAuthStateChange.mockImplementation((callback: (event: string) => void) => {
      authCallback = callback;
      return {
        data: {
          subscription: { unsubscribe: mockUnsubscribe },
        },
      };
    });

    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1', email: 'alice@example.com' },
        },
      },
    });

    const rendered = render(
      <UserProvider>
        <ContextProbe />
      </UserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-id')).toHaveTextContent('user-1');
    });

    expect(() => act(() => {
      authCallback?.('SIGNED_OUT');
    })).not.toThrow();

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    rendered.unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('refetches session on TOKEN_REFRESHED auth event', async () => {
    let authCallback: ((event: string) => void) | null = null;

    mockOnAuthStateChange.mockImplementation((callback: (event: string) => void) => {
      authCallback = callback;
      return {
        data: {
          subscription: { unsubscribe: mockUnsubscribe },
        },
      };
    });

    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-3', email: 'refresh@example.com' },
        },
      },
    });

    render(
      <UserProvider>
        <ContextProbe />
      </UserProvider>
    );

    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalledTimes(1);
    });

    act(() => {
      authCallback?.('TOKEN_REFRESHED');
    });

    await waitFor(() => {
      expect(mockGetSession.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
