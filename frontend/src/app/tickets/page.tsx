'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/context/UserContext';

/**
 * /tickets – Developer dashboard listing every ticket with a detail modal.
 *
 * Save as `app/tickets/page.tsx`.
 */

const supabase = createClient();

type TicketRow = {
  id: string;
  submitted_at: string;
  submitted_by: string | null;
  title: string;
  description: string;
  type: 'bug' | 'issue' | 'suggestion';
  status: string;
};

export default function TicketsPage() {
  const { user } = useUser();

  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // modal state
  const [selected, setSelected] = useState<TicketRow | null>(null);

  // ── fetch tickets ────────────────────────────────────────
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('developer_tickets')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch tickets:', error.message);
      setToast({ msg: 'Failed to load tickets.', ok: false });
    } else {
      setTickets(data as TicketRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // ── delete ticket ────────────────────────────────────────
  const deleteTicket = async (id: string) => {
    if (!confirm('Delete this ticket?')) return;
    const { error } = await supabase.from('developer_tickets').delete().eq('id', id);
    if (error) {
      console.error('Delete failed:', error.message);
      setToast({ msg: 'Failed to delete ticket.', ok: false });
    } else {
      setTickets((p) => p.filter((t) => t.id !== id));
      if (selected?.id === id) setSelected(null);
      setToast({ msg: 'Ticket deleted.', ok: true });
    }
  };

  // auto‑dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // ── helpers ──────────────────────────────────────────────
  const closeModal = () => setSelected(null);

  // lock body scroll when modal open
  useEffect(() => {
    if (selected) document.body.classList.add('modal-open');
    else document.body.classList.remove('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, [selected]);

  return (
    <div className='container py-4'>
      <h1 className='mb-4 d-flex align-items-center gap-2'>
        <i className='bi bi-list-task'></i> Developer Tickets
      </h1>

      {/* toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1055 }}>
          <div className={`alert ${toast.ok ? 'alert-success' : 'alert-danger'} alert-dismissible fade show`}>
            {toast.msg}
          </div>
        </div>
      )}

      {loading ? (
        <div className='text-center py-5'>
          <div className='spinner-border' role='status' />
        </div>
      ) : tickets.length === 0 ? (
        <p>No tickets have been submitted yet.</p>
      ) : (
        <div className='table-responsive'>
          <table className='table table-hover align-middle'>
            <thead className='table-light'>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Type</th>
                <th>Status</th>
                <th>Submitted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t, idx) => (
                <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(t)}>
                  <td>{idx + 1}</td>
                  <td>{t.title}</td>
                  <td className='text-capitalize'>{t.type}</td>
                  <td>{t.status}</td>
                  <td>{new Date(t.submitted_at).toLocaleString()}</td>
                  <td>
                    <button
                      className='btn btn-sm btn-outline-danger'
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTicket(t.id);
                      }}
                    >
                      <i className='bi bi-trash'></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── detail modal ─────────────────────────────────── */}
      {selected && (
        <>
          <div className='modal-backdrop fade show' onClick={closeModal} />
          <div className='modal fade show d-block' role='dialog' onClick={closeModal}>
            <div className='modal-dialog modal-lg' onClick={(e) => e.stopPropagation()}>
              <div className='modal-content rounded-3 shadow'>
                <div className='modal-header'>
                  <h5 className='modal-title'>{selected.title}</h5>
                  <button type='button' className='btn-close' aria-label='Close' onClick={closeModal} />
                </div>
                <div className='modal-body'>
                  <p className='mb-2'>
                    <span className='badge bg-secondary text-capitalize me-2'>{selected.type}</span>
                    <span className='badge bg-info me-2'>{selected.status}</span>
                    <small className='text-muted'>submitted {new Date(selected.submitted_at).toLocaleString()}</small>
                  </p>
                  <pre style={{ whiteSpace: 'pre-wrap' }}>{selected.description}</pre>
                </div>
                <div className='modal-footer'>
                  <button className='btn btn-secondary' onClick={closeModal}>
                    Close
                  </button>
                  {user?.id === selected.submitted_by && (
                    <button className='btn btn-danger' onClick={() => deleteTicket(selected.id)}>
                      Delete Ticket
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
