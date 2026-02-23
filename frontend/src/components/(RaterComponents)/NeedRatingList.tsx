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
      <div className='card border-0 bg-body px-4 pt-4 pb-2'>

        <h1 className='mb-1 text-center text-primary fw-bold'>Rater Dashboard</h1>
        <p className='text-center text-muted small mb-4'>
          {formRequests.length} pending evaluation{formRequests.length !== 1 ? 's' : ''}
        </p>

        {/* Top Controls */}
        <div className='d-flex justify-content-between align-items-center mb-3'>
          <button className='btn btn-success btn-sm px-3' onClick={() => setShowModal(true)} disabled={!user}>
            <i className='bi bi-plus-lg me-1'></i>Rate Unlisted Student
          </button>
          <button className='btn btn-outline-secondary btn-sm px-3' onClick={toggleSortOrder}>
            <i className='bi bi-calendar me-1'></i>
            Sort by Date {sortOrder === 'asc' ? <FaSortUp data-testid='sort-up-icon' /> : <FaSortDown data-testid='sort-down-icon' />}
          </button>
        </div>

        {/* Scrollable List */}
        <div className='overflow-auto' style={{ maxHeight: '520px' }} data-testid='list-group'>
          {formRequests.length === 0 ? (
            <div className='text-center text-muted py-5'>
              <i className='bi bi-inbox display-4 d-block mb-2'></i>
              No pending evaluations
            </div>
          ) : (
            formRequests.map((request) => (
              <div
                key={request.id}
                className='rounded border bg-body-secondary mb-3 p-3'
                data-testid='request-item'
              >
                {/* Row 1: student info + evaluate button */}
                <div className='d-flex justify-content-between align-items-start mb-2'>
                  <div>
                    <h5 className='fw-bold text-body mb-0'>{request.display_name}</h5>
                    <span className='text-muted small'>{request.email}</span>
                    <span className='text-muted small ms-2'>·</span>
                    <span className='text-muted small ms-2'>
                      <i className='bi bi-hospital me-1'></i>
                      {request.clinical_settings ?? 'N/A'}
                    </span>
                  </div>
                  <div className='d-flex flex-column align-items-end gap-1'>
                    <button
                      className='btn btn-primary btn-sm px-3'
                      onClick={() => router.push(`/dashboard/rater/form?id=${request.id}`)}
                    >
                      Evaluate
                    </button>
                    <small className='text-muted' style={{ fontSize: '0.7rem' }}>
                      {new Date(request.created_at).toLocaleDateString()} {new Date(request.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </small>
                  </div>
                </div>

                {/* Row 2: notes + goals boxes */}
                <div className='row g-2'>
                  <div className='col-6'>
                    <div className='rounded bg-body border p-2 h-100' style={{ fontSize: '0.82rem' }}>
                      <div className='text-muted fw-semibold mb-1' style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Relevant Activity
                      </div>
                      <span className='text-body'>{request.notes || <span className='text-muted fst-italic'>No notes provided</span>}</span>
                    </div>
                  </div>
                  <div className='col-6'>
                    <div className='rounded bg-body border p-2 h-100' style={{ fontSize: '0.82rem' }}>
                      <div className='text-muted fw-semibold mb-1' style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Stated Goals
                      </div>
                      <span className='text-body'>{request.goals || <span className='text-muted fst-italic'>No goals provided</span>}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
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