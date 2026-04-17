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

  it('covers catch block when profiles select throws unexpectedly', async () => {
    // RPC succeeds, but profiles.select() throws a raw error
    mockRpc.mockResolvedValue({ data: mockUsers, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => { throw new Error('Unexpected DB error'); }),
          update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) })),
        };
      }
      if (table === 'roles') {
        return { select: jest.fn(() => Promise.resolve({ data: roleRows, error: null })) };
      }
      return { select: jest.fn(() => Promise.resolve({ data: [], error: null })) };
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Manage Users')).toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  it('covers sort branches with three users: [Active, Deactivated, Active]', async () => {
    const threeUsers = [
      { id: 'row-1', user_id: 'u-1', email: 'alice@example.com', role: 'student', display_name: 'Alice' },
      { id: 'row-2', user_id: 'u-2', email: 'bob@example.com', role: 'rater', display_name: 'Bob' },
      { id: 'row-3', user_id: 'u-3', email: 'charlie@example.com', role: 'student', display_name: 'Charlie' },
    ];
    const threeProfiles = [
      { id: 'u-1', account_status: 'Active' },
      { id: 'u-2', account_status: 'Deactivated' },
      { id: 'u-3', account_status: 'Active' },
    ];

    mockRpc.mockResolvedValue({ data: threeUsers, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => Promise.resolve({ data: threeProfiles, error: null })),
          update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) })),
        };
      }
      if (table === 'roles') {
        return { select: jest.fn(() => Promise.resolve({ data: roleRows, error: null })) };
      }
      return { select: jest.fn(() => Promise.resolve({ data: [], error: null })) };
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('opens activate modal for a deactivated user', async () => {
    render(<AdminDashboard />);

    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument());

    // Bob is Deactivated, so his button says 'Activate'
    fireEvent.click(screen.getByRole('button', { name: 'Activate' }));

    await waitFor(() => expect(screen.getByText('Confirm Activation')).toBeInTheDocument());

    const modal = screen.getByText('Confirm Activation').closest('.modal-content');
    expect(modal).not.toBeNull();
    expect(within(modal as HTMLElement).getByRole('button', { name: 'Activate' })).toBeInTheDocument();

    // Confirm the activation
    fireEvent.click(within(modal as HTMLElement).getByRole('button', { name: 'Activate' }));

    await waitFor(() => {
      expect(screen.queryByText('Confirm Activation')).toBeNull();
    });
  });

  it('closes deactivate modal via cancel button', async () => {
    render(<AdminDashboard />);

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: 'Deactivate' })[0]);
    await waitFor(() => expect(screen.getByText('Confirm Deactivation')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByText('Confirm Deactivation')).toBeNull();
    });
  });

  it('closes deactivate modal via X button', async () => {
    const { container } = render(<AdminDashboard />);

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: 'Deactivate' })[0]);
    await waitFor(() => expect(screen.getByText('Confirm Deactivation')).toBeInTheDocument());

    const xButton = container.querySelector('.modal .btn-close-white') as HTMLElement;
    expect(xButton).not.toBeNull();
    fireEvent.click(xButton);

    await waitFor(() => {
      expect(screen.queryByText('Confirm Deactivation')).toBeNull();
    });
  });

  it('handles profilesError by returning early without setting users', async () => {
    mockRpc.mockResolvedValue({ data: mockUsers, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => Promise.resolve({ data: null, error: { message: 'profiles error' } })),
          update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) })),
        };
      }
      if (table === 'roles') {
        return { select: jest.fn(() => Promise.resolve({ data: roleRows, error: null })) };
      }
      return { select: jest.fn(() => Promise.resolve({ data: [], error: null })) };
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching account statuses:',
        expect.objectContaining({ message: 'profiles error' }),
      );
    });
    consoleSpy.mockRestore();
  });

  it('handles rolesError gracefully', async () => {
    rolesError = { message: 'roles fetch failed' };
    wireSupabase();

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching roles:',
        expect.objectContaining({ message: 'roles fetch failed' }),
      );
    });
    consoleSpy.mockRestore();
  });

  it('handles updateRoleError when saving role change', async () => {
    updateRoleError = { message: 'role update failed' };
    wireSupabase();

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<AdminDashboard />);

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    await waitFor(() => expect(screen.getByText('Edit User Role')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error updating role:',
        expect.objectContaining({ message: 'role update failed' }),
      );
    });
    consoleSpy.mockRestore();
  });

  it('handles updateStatusError when toggling user status', async () => {
    updateStatusError = { message: 'status update failed' };
    wireSupabase();

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<AdminDashboard />);

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: 'Deactivate' })[0]);
    await waitFor(() => expect(screen.getByText('Confirm Deactivation')).toBeInTheDocument());

    const modal = screen.getByText('Confirm Deactivation').closest('.modal-content');
    fireEvent.click(within(modal as HTMLElement).getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error changing status'),
        expect.objectContaining({ message: 'status update failed' }),
      );
    });
    consoleSpy.mockRestore();
  });

  it('defaults account_status to Active when no profile match exists for a user', async () => {
    // u-3 has no matching profile, so profile?.account_status is undefined → falls back to 'Active'
    const usersWithMissingProfile = [
      ...mockUsers,
      { id: 'row-3', user_id: 'u-3', email: 'charlie@example.com', role: 'student', display_name: 'Charlie' },
    ];

    mockRpc.mockResolvedValue({ data: usersWithMissingProfile, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          // Only u-1 and u-2 have profiles — u-3 has none
          select: jest.fn(() => Promise.resolve({
            data: [
              { id: 'u-1', account_status: 'Active' },
              { id: 'u-2', account_status: 'Deactivated' },
            ],
            error: null,
          })),
          update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) })),
        };
      }
      if (table === 'roles') {
        return { select: jest.fn(() => Promise.resolve({ data: roleRows, error: null })) };
      }
      return { select: jest.fn(() => Promise.resolve({ data: [], error: null })) };
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });
  });
});
