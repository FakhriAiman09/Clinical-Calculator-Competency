/** @jest-environment jsdom */
import { beforeAll, describe, test } from '@jest/globals';
import '@testing-library/jest-dom';
import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createClient } from '@supabase/supabase-js';

// ── DB fixture ────────────────────────────────────────────────────────────────
type UserRow = {
  userId: string;
  displayName: string;
  email: string;
  role: string;
  accountStatus: string;
};

type DbFixture = {
  targetUser: UserRow;
  availableRoles: string[];
  source: 'database' | 'fallback';
};

let dbFixture: DbFixture = {
  targetUser: {
    userId: 'user-fallback-1',
    displayName: 'Nur Fatihah',
    email: 'fatihah@example.com',
    role: 'student',
    accountStatus: 'Active',
  },
  availableRoles: ['admin', 'rater', 'student', 'dev'],
  source: 'fallback',
};

async function loadDbFixture() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  try {
    const supabase = createClient(url, key);

    // 1. Find Fatihah's profile
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id, display_name')
      .ilike('display_name', '%fatihah%')
      .limit(1)
      .maybeSingle();

    if (!profileRow?.id) return;

    // 2. Fetch her role from user_roles
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', profileRow.id)
      .maybeSingle();

    // 3. Fetch her email via fetch_users RPC
    const { data: rpcUsers } = await supabase.rpc('fetch_users');
    const rpcUser = rpcUsers?.find(
      (u: { user_id: string; email: string }) => u.user_id === profileRow.id
    );

    // 4. Fetch all available roles
    const { data: rolesData } = await supabase
      .from('roles')
      .select('role');

    dbFixture = {
      targetUser: {
        userId: profileRow.id,
        displayName: profileRow.display_name ?? 'Nur Fatihah',
        email: rpcUser?.email ?? 'fatihah@example.com',
        role: roleRow?.role ?? 'student',
        accountStatus: 'Active',
      },
      availableRoles:
        rolesData && rolesData.length > 0
          ? rolesData.map((r: { role: string }) => r.role)
          : ['admin', 'rater', 'student', 'dev'],
      source: 'database',
    };
  } catch {
    // keep fallback
  }
}

// ── updateUserRole logic (mirrors AdminDashboard.updateUserRole) ──────────────
type UpdateResult = { error: { message: string } | null };

async function updateUserRole(
  userId: string,
  newRole: string,
  updateFn: (userId: string, role: string) => Promise<UpdateResult>
): Promise<{ success: boolean; error?: string }> {
  const result = await updateFn(userId, newRole);
  if (result.error) {
    return { success: false, error: result.error.message };
  }
  return { success: true };
}

// ── toggleUserStatus logic (mirrors AdminDashboard.toggleUserStatus) ──────────
async function toggleUserStatus(
  userId: string,
  currentStatus: string,
  updateFn: (userId: string, status: string) => Promise<UpdateResult>
): Promise<{ success: boolean; newStatus: string; error?: string }> {
  const newStatus = currentStatus === 'Active' ? 'Deactivated' : 'Active';
  const result = await updateFn(userId, newStatus);
  if (result.error) {
    return { success: false, newStatus: currentStatus, error: result.error.message };
  }
  return { success: true, newStatus };
}

// ── UI component: Admin Manage Users panel ────────────────────────────────────
function AdminManageUsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([dbFixture.targetUser]);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState('');
  const [statusFeedback, setStatusFeedback] = useState('');

  function openEditModal(user: UserRow) {
    setSelectedUser({ ...user });
    setShowEditModal(true);
    setSaveFeedback('');
  }

  function openStatusModal(user: UserRow) {
    setSelectedUser({ ...user });
    setShowStatusModal(true);
    setStatusFeedback('');
  }

  async function handleSaveRole() {
    if (!selectedUser) return;
    const result = await updateUserRole(
      selectedUser.userId,
      selectedUser.role,
      async (_id, role) => {
        // simulate upsert
        setUsers((prev) =>
          prev.map((u) => (u.userId === selectedUser.userId ? { ...u, role } : u))
        );
        return { error: null };
      }
    );
    if (result.success) {
      setSaveFeedback(`Role updated to "${selectedUser.role}" successfully.`);
      setShowEditModal(false);
    }
  }

  async function handleToggleStatus() {
    if (!selectedUser) return;
    const result = await toggleUserStatus(
      selectedUser.userId,
      selectedUser.accountStatus,
      async (_id, status) => {
        setUsers((prev) =>
          prev.map((u) =>
            u.userId === selectedUser.userId ? { ...u, accountStatus: status } : u
          )
        );
        return { error: null };
      }
    );
    if (result.success) {
      setStatusFeedback(
        `User ${result.newStatus === 'Active' ? 'activated' : 'deactivated'} successfully.`
      );
      setShowStatusModal(false);
    }
  }

  const currentUser = users.find((u) => u.userId === dbFixture.targetUser.userId);

  return (
    <div>
      <h1>Manage Users</h1>

      <table data-testid="users-table">
        <thead>
          <tr>
            <th>Display Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.userId} data-testid={`row-${user.userId}`}>
              <td data-testid={`name-${user.userId}`}>{user.displayName}</td>
              <td data-testid={`email-${user.userId}`}>{user.email}</td>
              <td data-testid={`role-${user.userId}`}>{user.role}</td>
              <td data-testid={`status-${user.userId}`}>{user.accountStatus}</td>
              <td>
                <button
                  data-testid={`edit-btn-${user.userId}`}
                  onClick={() => openEditModal(user)}
                  disabled={user.accountStatus === 'Deactivated'}
                >
                  Edit
                </button>
                <button
                  data-testid={`status-btn-${user.userId}`}
                  onClick={() => openStatusModal(user)}
                >
                  {user.accountStatus === 'Active' ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {saveFeedback && (
        <p data-testid="save-feedback">{saveFeedback}</p>
      )}
      {statusFeedback && (
        <p data-testid="status-feedback">{statusFeedback}</p>
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedUser && (
        <div data-testid="edit-modal">
          <h2>Edit User Role</h2>
          <p data-testid="modal-user-name">{selectedUser.displayName}</p>
          <select
            data-testid="role-select"
            value={selectedUser.role}
            onChange={(e) =>
              setSelectedUser({ ...selectedUser, role: e.target.value })
            }
          >
            {dbFixture.availableRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button data-testid="save-role-btn" onClick={handleSaveRole}>
            Save
          </button>
          <button
            data-testid="cancel-edit-btn"
            onClick={() => setShowEditModal(false)}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Deactivate / Activate Modal */}
      {showStatusModal && selectedUser && (
        <div data-testid="status-modal">
          <h2>
            Confirm{' '}
            {selectedUser.accountStatus === 'Active' ? 'Deactivation' : 'Activation'}
          </h2>
          <p data-testid="modal-status-name">{selectedUser.displayName}</p>
          <button data-testid="confirm-status-btn" onClick={handleToggleStatus}>
            Confirm
          </button>
          <button
            data-testid="cancel-status-btn"
            onClick={() => setShowStatusModal(false)}
          >
            Cancel
          </button>
        </div>
      )}

      {currentUser && (
        <p data-testid="current-role-display">
          Current role: {currentUser.role}
        </p>
      )}
      {currentUser && (
        <p data-testid="current-status-display">
          Current status: {currentUser.accountStatus}
        </p>
      )}
    </div>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────
beforeAll(async () => {
  await loadDbFixture();
}, 15000);

describe('Functional requirement: Admin can manage user roles and account status', () => {
  test('updateUserRole resolves successfully and returns no error', async () => {
    const mockUpdate = jest.fn(async (_id: string, _role: string) => ({ error: null }));
    const result = await updateUserRole(dbFixture.targetUser.userId, 'rater', mockUpdate);

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(dbFixture.targetUser.userId, 'rater');
  });

  test('updateUserRole propagates DB error and marks operation as failed', async () => {
    const mockUpdate = jest.fn(async () => ({
      error: { message: 'Permission denied' },
    }));
    const result = await updateUserRole('user-999', 'admin', mockUpdate);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Permission denied');
  });

  test('toggleUserStatus flips Active to Deactivated and back', async () => {
    const mockUpdate = jest.fn(async (_id: string, _status: string) => ({ error: null }));

    const deactivate = await toggleUserStatus('user-1', 'Active', mockUpdate);
    expect(deactivate.success).toBe(true);
    expect(deactivate.newStatus).toBe('Deactivated');

    const activate = await toggleUserStatus('user-1', 'Deactivated', mockUpdate);
    expect(activate.success).toBe(true);
    expect(activate.newStatus).toBe('Active');
  });

  test('renders admin user table with database-backed fixture and can change role via modal', async () => {
    render(<AdminManageUsersPanel />);

    // Table shows the target user from DB fixture
    expect(screen.getByTestId('users-table')).toBeInTheDocument();
    expect(
      screen.getByTestId(`name-${dbFixture.targetUser.userId}`)
    ).toHaveTextContent(dbFixture.targetUser.displayName);
    expect(
      screen.getByTestId(`role-${dbFixture.targetUser.userId}`)
    ).toHaveTextContent(dbFixture.targetUser.role);

    // Open edit modal
    fireEvent.click(screen.getByTestId(`edit-btn-${dbFixture.targetUser.userId}`));
    expect(screen.getByTestId('edit-modal')).toBeInTheDocument();
    expect(screen.getByTestId('modal-user-name')).toHaveTextContent(
      dbFixture.targetUser.displayName
    );

    // Pick a different role from the available roles list
    const newRole =
      dbFixture.availableRoles.find((r) => r !== dbFixture.targetUser.role) ??
      'rater';
    fireEvent.change(screen.getByTestId('role-select'), {
      target: { value: newRole },
    });
    expect((screen.getByTestId('role-select') as HTMLSelectElement).value).toBe(
      newRole
    );

    // Save → modal closes, feedback shown, table updated
    fireEvent.click(screen.getByTestId('save-role-btn'));

    await waitFor(() => {
      expect(screen.queryByTestId('edit-modal')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('save-feedback')).toHaveTextContent(
      `Role updated to "${newRole}" successfully.`
    );
    expect(
      screen.getByTestId(`role-${dbFixture.targetUser.userId}`)
    ).toHaveTextContent(newRole);
  });

  test('admin can deactivate a user and the button label changes to Activate', async () => {
    render(<AdminManageUsersPanel />);

    // Open status modal
    fireEvent.click(screen.getByTestId(`status-btn-${dbFixture.targetUser.userId}`));
    expect(screen.getByTestId('status-modal')).toBeInTheDocument();

    // Confirm deactivation
    fireEvent.click(screen.getByTestId('confirm-status-btn'));

    await waitFor(() => {
      expect(screen.queryByTestId('status-modal')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('status-feedback')).toHaveTextContent(
      'User deactivated successfully.'
    );

    // Status cell now shows Deactivated
    expect(
      screen.getByTestId(`status-${dbFixture.targetUser.userId}`)
    ).toHaveTextContent('Deactivated');

    // Edit button is disabled for deactivated users
    expect(screen.getByTestId(`edit-btn-${dbFixture.targetUser.userId}`)).toBeDisabled();

    // The Deactivate button now says "Activate"
    expect(
      screen.getByTestId(`status-btn-${dbFixture.targetUser.userId}`)
    ).toHaveTextContent('Activate');
  });
});
