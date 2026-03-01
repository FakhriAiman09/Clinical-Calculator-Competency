'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRequireRole } from '@/utils/useRequiredRole';

const supabase = createClient();

const AdminDashboard = () => {
  useRequireRole(['admin', 'dev']);

  interface User {
    id: string;
    user_id: string;
    email: string;
    role: string;
    display_name: string;
  }

  interface Profile {
    id: string;
    account_status: string;
  }

  interface Role {
    role: string;
  }

  const [users, setUsers] = useState<(User & { account_status: string })[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedUser, setSelectedUser] = useState<(User & { account_status: string }) | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const { data: users, error: usersError } = await supabase.rpc('fetch_users');
      if (usersError) { console.error('Error fetching users:', usersError); return; }

      const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id, account_status');
      if (profilesError) { console.error('Error fetching account statuses:', profilesError); return; }

      const usersWithStatus = users.map((user: User) => {
        const profile = profiles.find((p: Profile) => p.id === user.user_id);
        return { ...user, account_status: profile?.account_status || 'Active' };
      });

      setUsers(usersWithStatus);
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoles = useCallback(async (): Promise<void> => {
    const { data, error } = await supabase.from('roles').select('role');
    if (error) { console.error('Error fetching roles:', error); }
    else { setRoles(data.map((r: Role) => r.role)); }
  }, []);

  const handleCloseModal = () => { setShowModal(false); setSelectedUser(null); };

  const updateUserRole = async () => {
    if (!selectedUser) return;
    const { error } = await supabase
      .from('user_roles')
      .update({ role: selectedUser.role })
      .eq('user_id', selectedUser.user_id);
    if (error) { console.error('Error updating role:', error); return; }
    fetchUsers();
    setShowModal(false);
  };

  const toggleUserStatus = async () => {
    if (!selectedUser) return;
    const newStatus = selectedUser.account_status === 'Active' ? 'Deactivated' : 'Active';
    const { error } = await supabase
      .from('profiles')
      .update({ account_status: newStatus })
      .eq('id', selectedUser.user_id);
    if (error) { console.error(`Error changing status to ${newStatus}:`, error); return; }
    fetchUsers();
    setShowDeactivateModal(false);
  };

  const filteredUsers = users
    .filter(
      (user) =>
        (user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedRole === '' || user.role === selectedRole)
    )
    .sort((a, b) => {
      if (a.account_status === 'Deactivated' && b.account_status !== 'Deactivated') return 1;
      if (a.account_status !== 'Deactivated' && b.account_status === 'Deactivated') return -1;
      return 0;
    });

  const fetchAll = useCallback(async (): Promise<void> => {
    await fetchUsers();
    await fetchRoles();
  }, [fetchUsers, fetchRoles]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div className='container text-center'>
      <h1 className='my-4 fw-bold text-body'>Manage Users</h1>

      {/* Search & Filter */}
      <div className='mb-4 row gx-3 align-items-center'>
        <div className='col-md-8 mb-2 mb-md-0'>
          <input
            type='text'
            className='form-control'
            placeholder='Search by name or email...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className='col-md-4'>
          <select className='form-select' value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
            <option value=''>All Roles</option>
            {roles.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading Spinner */}
      {loading ? (
        <div className='my-5'>
          <div className='spinner-border text-primary' role='status'>
            <span className='visually-hidden'>Loading...</span>
          </div>
        </div>
      ) : (
        <table className='table table-hover shadow rounded'>
          <thead className='table-dark'>
            <tr>
              <th>Display Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr
                key={user.user_id}
                className={`align-middle ${user.account_status === 'Deactivated' ? 'table-secondary text-muted' : ''}`}
              >
                <td>{user.display_name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <span className={`badge rounded-pill ${user.account_status === 'Active' ? 'bg-success' : 'bg-secondary'}`}>
                    {user.account_status}
                  </span>
                </td>
                <td>
                  <button
                    className='btn btn-primary btn-sm me-2'
                    onClick={() => { setSelectedUser(user); setShowModal(true); }}
                    disabled={user.account_status === 'Deactivated'}
                  >
                    Edit
                  </button>
                  <button
                    className='btn btn-danger btn-sm'
                    onClick={() => { setSelectedUser(user); setShowDeactivateModal(true); }}
                  >
                    {user.account_status === 'Active' ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Edit Role Modal */}
      {showModal && selectedUser && (
        <>
          <div className='modal-backdrop fade show'></div>
          <div className='modal show d-block' tabIndex={-1}>
            <div className='modal-dialog'>
              <div className='modal-content rounded shadow-lg'>
                <div className='modal-header bg-primary text-white'>
                  <h5 className='modal-title'>Edit User Role</h5>
                  <button type='button' className='btn-close btn-close-white' onClick={handleCloseModal}></button>
                </div>
                <div className='modal-body text-start'>
                  <div className='p-3 border rounded mb-3'>
                    <p><strong>ID:</strong> {selectedUser.user_id}</p>
                    <p><strong>Display Name:</strong> {selectedUser.display_name}</p>
                    <p><strong>Email:</strong> {selectedUser.email}</p>
                  </div>
                  <div className='p-3 border rounded'>
                    <label htmlFor='formRole' className='form-label fw-bold'>Role</label>
                    <select
                      id='formRole'
                      className='form-select shadow-sm'
                      value={selectedUser.role}
                      onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
                    >
                      {roles.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className='modal-footer'>
                  <button type='button' className='btn btn-secondary' onClick={handleCloseModal}>Close</button>
                  <button type='button' className='btn btn-primary' onClick={updateUserRole}>Save</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Deactivate/Activate Confirmation Modal */}
      {showDeactivateModal && selectedUser && (
        <>
          <div className='modal-backdrop fade show'></div>
          <div className='modal show d-block' tabIndex={-1}>
            <div className='modal-dialog'>
              <div className='modal-content rounded shadow-lg'>
                <div className='modal-header bg-danger text-white'>
                  <h5 className='modal-title'>
                    Confirm {selectedUser.account_status === 'Active' ? 'Deactivation' : 'Activation'}
                  </h5>
                  <button type='button' className='btn-close btn-close-white' onClick={() => setShowDeactivateModal(false)}></button>
                </div>
                <div className='modal-body text-start'>
                  <p>
                    Are you sure you want to{' '}
                    <strong>{selectedUser.account_status === 'Active' ? 'deactivate' : 'activate'}</strong> this user?
                  </p>
                  <div className='p-3 border rounded'>
                    <p><strong>ID:</strong> {selectedUser.user_id}</p>
                    <p><strong>Display Name:</strong> {selectedUser.display_name}</p>
                    <p><strong>Email:</strong> {selectedUser.email}</p>
                  </div>
                </div>
                <div className='modal-footer'>
                  <button type='button' className='btn btn-secondary' onClick={() => setShowDeactivateModal(false)}>Cancel</button>
                  <button type='button' className='btn btn-danger' onClick={toggleUserStatus}>
                    {selectedUser.account_status === 'Active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;