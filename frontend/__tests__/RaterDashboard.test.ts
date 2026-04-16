import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useUser } from '@/context/UserContext';
import { mockFormRequests } from '../__mocks__/mockFormRequest';

let RaterDashboard: typeof import('@/components/(RaterComponents)/NeedRatingList').default;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockSupabaseData: any;
let mockSupabaseError: { message: string } | null = null;

function resolveSupabaseResponse() {
  return Promise.resolve({
    data: mockSupabaseData,
    error: mockSupabaseError,
  });
}

function createEqChain() {
  return {
    eq: jest.fn(resolveSupabaseResponse),
  };
}

function createFromResult() {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn(createEqChain),
  };
}

function createRpcResponse() {
  return Promise.resolve({
    data: mockSupabaseData,
    error: null,
  });
}

jest.mock('@/context/UserContext');

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(createFromResult),
    rpc: jest.fn(createRpcResponse),
  })),
}));

jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      prefetch: () => null,
    };
  },
}));

describe('RaterDashboard Component (.ts version)', () => {
  beforeEach(() => {
    RaterDashboard = require('@/components/(RaterComponents)/NeedRatingList').default;
    mockSupabaseData = mockFormRequests;
    mockSupabaseError = null;

    (useUser as jest.Mock).mockReturnValue({
      user: {
        id: 'rater-123',
        email: 'rater@test.com',
      },
      loading: false,
    });
  });

  it('renders loading state initially', () => {
    (useUser as jest.Mock).mockReturnValue({
      user: null,
      loading: true,
    });

    render(React.createElement(RaterDashboard));

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays form requests after loading', async () => {
    render(React.createElement(RaterDashboard));

    await waitFor(() => {
      expect(screen.getByText('Student A')).toBeInTheDocument();
      expect(screen.getByText('a@test.com')).toBeInTheDocument();
      expect(screen.getByText('Note 1')).toBeInTheDocument();

      expect(screen.getByText('Student B')).toBeInTheDocument();
      expect(screen.getByText('b@test.com')).toBeInTheDocument();
      expect(screen.getByText('Note 2')).toBeInTheDocument();

      expect(screen.getByText('Student C')).toBeInTheDocument();
      expect(screen.getByText('c@test.com')).toBeInTheDocument();
      expect(screen.getByText('Note 3')).toBeInTheDocument();
    });
  });

  it('sorts requests by date', async () => {
    render(React.createElement(RaterDashboard));

    await waitFor(() => {
      expect(screen.getAllByTestId('request-item')).toHaveLength(3);
    });

    const initialItems = screen.getAllByTestId('request-item');
    expect(initialItems[0].textContent).toContain('Student A');
    expect(initialItems[1].textContent).toContain('Student B');
    expect(initialItems[2].textContent).toContain('Student C');

    const sortButton = screen.getByRole('button', { name: /sort by date/i });
    fireEvent.click(sortButton);

    await waitFor(() => {
      const sortedItems = screen.getAllByTestId('request-item');
      expect(sortedItems[0].textContent).toContain('Student C');
      expect(sortedItems[1].textContent).toContain('Student B');
      expect(sortedItems[2].textContent).toContain('Student A');
    });

    fireEvent.click(sortButton);

    await waitFor(() => {
      const revertedItems = screen.getAllByTestId('request-item');
      expect(revertedItems[0].textContent).toContain('Student A');
      expect(revertedItems[1].textContent).toContain('Student B');
      expect(revertedItems[2].textContent).toContain('Student C');
    });
  });

  it('shows empty state when no requests exist', async () => {
    mockSupabaseData = [];

    render(React.createElement(RaterDashboard));

    await waitFor(() => {
      expect(screen.getByText('No pending evaluations')).toBeInTheDocument();
      expect(screen.queryByTestId('request-item')).toBeNull();
    });
  });

  it('handles Supabase errors gracefully', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    mockSupabaseError = { message: 'Database error' };

    render(React.createElement(RaterDashboard));

    await waitFor(() => {
      expect(screen.queryByText('Student A')).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching form requests:',
        'Database error'
      );
    });

    consoleErrorSpy.mockRestore();
  });
});
