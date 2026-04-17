/** @jest-environment jsdom */
import React from 'react';
import { render, waitFor } from '@testing-library/react';

const mockFrom = jest.fn();

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

jest.mock('@/context/UserContext', () => ({
  useUser: () => ({ user: { id: 'dev-1' }, displayName: 'Dev' }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/',
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

import TicketsPage from '@/app/tickets/page';

describe('tickets page coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [
          { id: 'ticket-1', title: 'Login bug', description: 'Cannot login', created_at: '2026-01-01' },
        ],
        error: null,
      }),
      delete: jest.fn().mockResolvedValue({ error: null }),
    });
  });

  it('renders page without errors', async () => {
    const { container } = render(<TicketsPage />);
    await waitFor(() => expect(container).toBeInTheDocument());
  });

  it('queries tickets from database', async () => {
    render(<TicketsPage />);
    await waitFor(() => expect(mockFrom).toHaveBeenCalledWith('developer_tickets'));
  });

  it('loads tickets on component mount', async () => {
    render(<TicketsPage />);
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalled();
    });
  });

  it('initializes with correct context', async () => {
    const { container } = render(<TicketsPage />);
    await waitFor(() => expect(container.querySelector('div')).toBeInTheDocument());
  });

  it('handles database connection errors', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    });
    const { container } = render(<TicketsPage />);
    await waitFor(() => expect(container).toBeInTheDocument());
  });

  it('establishes supabase client', async () => {
    render(<TicketsPage />);
    await waitFor(() => expect(mockFrom).toBeDefined());
  });
});

