/** @jest-environment jsdom */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { within } from '@testing-library/react';

const mockUseRequireRole = jest.fn();
const mockRpc = jest.fn();
const mockFrom = jest.fn();

const mockUsers = [
  {
    id: 'row-1',
    user_id: 'u-1',
    email: 'alice@example.com',
    role: 'student',
    display_name: 'Alice',
  },
  {
    id: 'row-2',
    user_id: 'u-2',
    email: 'bob@example.com',
    role: 'rater',
    display_name: 'Bob',
  },
];

let profileRows = [
  { id: 'u-1', account_status: 'Active' },
  { id: 'u-2', account_status: 'Deactivated' },
];

let roleRows = [{ role: 'student' }, { role: 'rater' }, { role: 'admin' }, { role: 'dev' }];
let rpcError: { message: string } | null = null;
let rolesError: { message: string } | null = null;
let updateRoleError: { message: string } | null = null;
let updateStatusError: { message: string } | null = null;

jest.mock('@/utils/useRequiredRole', () => ({
  useRequireRole: (...args: unknown[]) => mockUseRequireRole(...args),
}));

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

import AdminDashboard from '@/app/dashboard/admin/userList/page';

function wireSupabase() {
  mockRpc.mockImplementation((fnName: string) => {
    if (fnName === 'fetch_users') {
      return Promise.resolve({ data: mockUsers, error: rpcError });
    }
    return Promise.resolve({ data: null, error: null });
  });

  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: jest.fn(() => Promise.resolve({ data: profileRows, error: null })),
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: updateStatusError })),
        })),
      };
    }

    if (table === 'roles') {
      return {
        select: jest.fn(() => Promise.resolve({ data: roleRows, error: rolesError })),
      };
    }

    if (table === 'user_roles') {
      return {
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: updateRoleError })),
        })),
      };
    }

    return {
      select: jest.fn(() => Promise.resolve({ data: [], error: null })),
    };
  });
}

describe('admin user list page coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    profileRows = [
      { id: 'u-1', account_status: 'Active' },
      { id: 'u-2', account_status: 'Deactivated' },
    ];
    roleRows = [{ role: 'student' }, { role: 'rater' }, { role: 'admin' }, { role: 'dev' }];
    rpcError = null;
    rolesError = null;
    updateRoleError = null;
    updateStatusError = null;
    wireSupabase();
  });

  it('calls role guard and renders loaded users', async () => {
    render(<AdminDashboard />);

    expect(mockUseRequireRole).toHaveBeenCalledWith(['admin', 'dev']);

    await waitFor(() => {
      expect(screen.getByText('Manage Users')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('filters users by search and role', async () => {
    render(<AdminDashboard />);

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/search by name or email/i), {
      target: { value: 'alice' },
    });

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).toBeNull();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'student' } });
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('opens edit modal and saves selected role', async () => {
    render(<AdminDashboard />);

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    await waitFor(() => expect(screen.getByText('Edit User Role')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'admin' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.queryByText('Edit User Role')).toBeNull();
    });
  });

  it('opens deactivate modal and confirms status toggle', async () => {
    render(<AdminDashboard />);

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: 'Deactivate' })[0]);
    await waitFor(() => expect(screen.getByText('Confirm Deactivation')).toBeInTheDocument());

    const modal = screen.getByText('Confirm Deactivation').closest('.modal-content');
    expect(modal).not.toBeNull();
    fireEvent.click(within(modal as HTMLElement).getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => {
      expect(screen.queryByText('Confirm Deactivation')).toBeNull();
    });
  });

  it('stays resilient when fetch_users RPC fails', async () => {
    rpcError = { message: 'rpc failed' };
    wireSupabase();

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Manage Users')).toBeInTheDocument();
    });
  });
});
