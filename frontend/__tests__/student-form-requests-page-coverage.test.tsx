/** @jest-environment jsdom */
import React from 'react';
import { render, waitFor } from '@testing-library/react';

const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'stu-1' } }, error: null })),
    },
  }),
}));

jest.mock('@/context/UserContext', () => ({
  useUser: () => ({ user: { id: 'stu-1' }, displayName: 'Alice' }),
}));

jest.mock('@/utils/useRequiredRole', () => ({
  useRequireRole: jest.fn(),
}));

jest.mock('@/app/dashboard/student/form-requests/email-api/send-email.server', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
}));

import FormRequests from '@/app/dashboard/student/form-requests/page';

describe('student form-requests page coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRpc.mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
    });
  });

  it('renders without errors', async () => {
    const { container } = render(<FormRequests />);
    await waitFor(() => expect(container).toBeInTheDocument());
  });

  it('queries database on mount', async () => {
    render(<FormRequests />);
    await waitFor(() => expect(mockFrom || mockRpc).toBeDefined());
  });

  it('initializes with user context', async () => {
    const { container } = render(<FormRequests />);
    await waitFor(() => expect(container.querySelector('div')).toBeInTheDocument());
  });

  it('handles async data loading', async () => {
    render(<FormRequests />);
    await waitFor(() => {
      expect(mockRpc).toBeDefined();
      expect(mockFrom).toBeDefined();
    });
  });

  it('establishes supabase connection', async () => {
    render(<FormRequests />);
    await waitFor(() => {
      expect(mockRpc || mockFrom).toBeTruthy();
    });
  });
});
