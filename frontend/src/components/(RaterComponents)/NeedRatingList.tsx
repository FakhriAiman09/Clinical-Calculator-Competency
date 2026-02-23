'use client';

import { useState, useEffect } from 'react';
import { FaSortUp, FaSortDown } from 'react-icons/fa';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import UnlistedStudentForm from './UnlistedStudentForm';

const supabase = createClient();

const RaterDashboard = () => {
  interface FormRequest {
    id: string;
    created_at: string;
    student_id: string;
    display_name?: string;
    email?: string;
    clinical_settings: string;
    completed_by: string;
    notes: string;
    goals: string;
    active_status: boolean;
  }

  const { user } = useUser();
  const [formRequests, setFormRequests] = useState<FormRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const fetchFormRequests = async () => {
      setLoading(true);

      const { data: formRequests, error: formError } = await supabase
        .from('form_requests')
        .select('*')
        .eq('completed_by', user.id)
        .eq('active_status', true); // Only fetch active requests

      if (formError) {
        console.error('Error fetching form requests:', formError.message);
        setLoading(false);
        return;
      }

      const { data: users, error: userError } = await supabase.rpc('fetch_users');

      if (userError) {
        console.error('Error fetching users:', userError.message);
        setLoading(false);
        return;
      }

      const requests = (formRequests || []).map((request) => {
        const student = users.find((u: { user_id: string }) => u.user_id === request.student_id);
        return {
          ...request,
          display_name: student?.display_name || 'Unknown',
          email: student?.email,
        };
      });

      setFormRequests(requests);
      setLoading(false);
    };

    fetchFormRequests();
  }, [user]);

  const toggleSortOrder = () => {
    const newSortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newSortOrder);
    setFormRequests((prevRequests) =>
      [...prevRequests].sort((a, b) =>
        newSortOrder === 'asc'
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    );
  };

  const hasActiveRequestForStudent = (studentId: string) => {
    return formRequests.some((request) => request.student_id === studentId && request.active_status === true);
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div className='container mt-4'>
      <div className='card p-3 border-0 bg-body'>
        <h1 className='mb-3 text-center text-primary'>Rater Dashboard</h1>

        {/* Top Controls */}
        <div className='d-flex justify-content-between align-items-center mb-3'>
          <button className='btn btn-success' onClick={() => setShowModal(true)} disabled={!user}>
            Rate Unlisted Student
          </button>
          <button className='btn btn-secondary' onClick={toggleSortOrder}>
            Sort by Date Requested {sortOrder === 'asc' ? <FaSortUp data-testid="sort-up-icon" /> : <FaSortDown data-testid="sort-down-icon" />}
          </button>
        </div>

        {/* Scrollable List */}
        <div className='card overflow-auto' style={{ maxHeight: '500px' }}>
          <div className='list-group' data-testid='list-group'>
            {formRequests.map((request) => (
              <div
                key={request.id}
                className='list-group-item d-flex justify-content-between align-items-stretch p-3 mb-2 bg-body rounded shadow-sm'
              >
                <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <h4 className='fw-bold text-body' data-testid='request-item'> {request.display_name}</h4>
                  <p className='text-muted small mb-0'>{request.email}</p>
                  <p className='text-muted small mb-0'> Setting: {request.clinical_settings ?? 'N/A'}</p>
                </div>
                <div
                  className='border rounded p-2 bg-body-secondary'
                  style={{ flex: '2', overflowY: 'auto', fontSize: '14px', marginLeft: '10px' }}
                >
                  <div className='text-secondary fw-bold mb-1'>Relevant Activity:</div>
                  <span>{request.notes || 'No notes provided'}</span>
                </div>
                <div
                  className='border rounded p-2 bg-body-secondary'
                  style={{ flex: '2', overflowY: 'auto', fontSize: '14px', marginLeft: '10px' }}
                >
                  <div className='text-secondary fw-bold mb-1'>Stated Goals:</div>
                  <span>{request.goals || 'No goals provided'}</span>
                </div>
                <div className='d-flex flex-column justify-content-between align-items-end' style={{ flex: '1' }}>
                  <button
                    className='btn btn-primary btn-md mb-2'
                    onClick={() => router.push(`/dashboard/rater/form?id=${request.id}`)}
                  >
                    Evaluate
                  </button>
                  <small className='text-muted mt-2'>{new Date(request.created_at).toLocaleString()}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal with Fade Animation */}
      {showModal && (
        <>
          {/* Backdrop */}
          <div className='modal-backdrop fade show' style={{ zIndex: 1040 }}></div>

          {/* Modal */}
          <div
            className='modal fade show d-block'
            tabIndex={-1}
            role='dialog'
            style={{ zIndex: 1050, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <div className='modal-dialog modal-lg modal-dialog-centered'>
              <div className='modal-content shadow-lg'>
                <div className='modal-header'>
                  <h5 className='modal-title'>Rate Unlisted Student</h5>
                  <button type='button' className='btn-close' onClick={() => setShowModal(false)}></button>
                </div>
                <div className='modal-body'>
                  <UnlistedStudentForm
                    raterId={user!.id}
                    hasActiveRequestForStudent={hasActiveRequestForStudent}
                    onSuccess={(newRequestId: string) => {
                      setShowModal(false);
                      router.push(`/dashboard/rater/form?id=${newRequestId}`);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RaterDashboard;