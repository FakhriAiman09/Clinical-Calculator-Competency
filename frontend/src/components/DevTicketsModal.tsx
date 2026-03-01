'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/context/UserContext';

const supabase = createClient();

interface DeveloperTicketModalProps {
  show: boolean;
  onClose: () => void;
}

export default function DeveloperTicketModal({ show, onClose }: DeveloperTicketModalProps) {
  const { user } = useUser();

  // ── form state ────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'bug' | 'issue' | 'suggestion'>('bug');

  // ── UX state ──────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [submitted, setSubmitted] = useState(false); // flag when ticket saved

  // derived flag: are all required fields filled?
  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && type.trim().length > 0;

  // ── helpers ───────────────────────────────────────────────
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setType('bug');
    setSubmitted(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    const { error } = await supabase.from('developer_tickets').insert({
      title,
      description,
      type,
      status: 'open',
      submitted_by: user?.id ?? null,
    });

    if (error) {
      setToast({ msg: error.message, ok: false });
    } else {
      setToast({ msg: '✅ Ticket submitted!', ok: true });
      setSubmitted(true);
      resetForm();
    }
    setLoading(false);
  };

  // auto‑dismiss toast (global) – keeps showing even after modal closes
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // lock body scroll while modal open
  useEffect(() => {
    if (show) document.body.classList.add('modal-open');
    else document.body.classList.remove('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, [show]);

  if (!show) {
    // still render global toast so it can outlive modal
    return toast ? (
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1055 }}>
        <div className={`alert ${toast.ok ? 'alert-success' : 'alert-danger'} alert-dismissible fade show`}>
          {toast.msg}
        </div>
      </div>
    ) : null;
  }

  return (
    <>
      {/* toast (also rendered outside when modal hidden) */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1055 }}>
          <div className={`alert ${toast.ok ? 'alert-success' : 'alert-danger'} alert-dismissible fade show`}>
            {toast.msg}
          </div>
        </div>
      )}

      {/* backdrop */}
      <div className='modal-backdrop fade show' onClick={onClose} />

      {/* modal */}
      <div className='modal fade show d-block' tabIndex={-1} role='dialog' aria-modal='true' onClick={onClose}>
        <div className='modal-dialog modal-lg' role='document' onClick={(e) => e.stopPropagation()}>
          <div className='modal-content rounded-3 shadow'>
            <div className='modal-header'>
              <h5 className='modal-title'>Submit a Developer Ticket</h5>
              <button type='button' className='btn-close' aria-label='Close' onClick={onClose} />
            </div>

            <form onSubmit={handleSubmit}>
              <div className='modal-body'>
                {/* ticket type */}
                <div className='mb-3'>
                  <label htmlFor='ticket-type' className='form-label fw-semibold'>
                    Ticket Type
                  </label>
                  <select
                    id='ticket-type'
                    className='form-select'
                    value={type}
                    onChange={(e) => setType(e.target.value as typeof type)}
                    disabled={submitted}
                  >
                    <option value='bug'>Bug</option>
                    <option value='issue'>Issue</option>
                    <option value='suggestion'>Suggestion</option>
                  </select>
                </div>

                {/* title */}
                <div className='mb-3'>
                  <label htmlFor='ticket-title' className='form-label fw-semibold'>
                    Title
                  </label>
                  <input
                    id='ticket-title'
                    type='text'
                    className='form-control'
                    placeholder='Brief summary'
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={submitted}
                  />
                </div>

                {/* description */}
                <div className='mb-3'>
                  <label htmlFor='ticket-description' className='form-label fw-semibold'>
                    Description
                  </label>
                  <textarea
                    id='ticket-description'
                    className='form-control'
                    rows={5}
                    placeholder='Steps to reproduce, expected vs. actual behaviour, etc.'
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={submitted}
                  />
                </div>
              </div>

              <div className='modal-footer'>
                <button
                  type='button'
                  className='btn btn-secondary'
                  onClick={() => {
                    onClose();
                    resetForm();
                  }}
                >
                  {submitted ? 'Close' : 'Cancel'}
                </button>

                {!submitted && (
                  <button type='submit' className='btn btn-primary' disabled={loading || !canSubmit}>
                    {loading ? 'Submitting…' : 'Submit Ticket'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
