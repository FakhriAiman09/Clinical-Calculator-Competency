'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/utils/supabase/client';
import sanitizeHtml from 'sanitize-html';
import MarkdownIt from 'markdown-it';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import MarkdownPreview from '@uiw/react-markdown-preview';

// Dynamically load the markdown editor (client-only)
const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

// Safe markdown renderer
const mdParser = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
});

type Announcement = {
  id: string;
  message: string;
  start_date: string;
  end_date: string;
  announcement_type: 'info' | 'warning' | 'danger';
};

export default function AdminAnnouncements() {
  const supabase = createClient();

  // -------------------
  // State
  // -------------------
  const [message, setMessage] = useState('');
  const [type, setType] = useState<Announcement['announcement_type']>('info');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // -------------------
  // Fetch all announcements
  // -------------------
  const fetchAnnouncements = useCallback(async (): Promise<void> => {
    const { data, error } = await supabase.from('announcements').select('*').order('start_date', { ascending: false });

    if (error) {
      console.error('Fetch error:', error);
    } else {
      setAnnouncements(data as Announcement[]);
    }
  }, [supabase]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  /**
   * Save or update an announcement
   */
  const handleSave = async (): Promise<void> => {
    if (!message.trim() || !startDate || !endDate) {
      setError('Please fill out all required fields.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      setError('End date must be after start date.');
      return;
    }

    setSaving(true);
    setSuccess(false);
    setError(null);

    const cleanedMessage = sanitizeHtml(message, {
      allowedTags: [],
      allowedAttributes: {},
    });

    if (editingId) {
      // Update existing announcement
      const { error } = await supabase
        .from('announcements')
        .update({
          message: cleanedMessage,
          start_date: startDate,
          end_date: endDate,
          announcement_type: type,
        })
        .eq('id', editingId);

      setSaving(false);

      if (error) {
        console.error('Update error:', error);
        setError('Failed to update announcement.');
      } else {
        setSuccess(true);
        resetForm();
        fetchAnnouncements();
      }
    } else {
      // Insert new announcement
      const { error } = await supabase.from('announcements').insert({
        message: cleanedMessage,
        start_date: startDate,
        end_date: endDate,
        announcement_type: type,
      });

      setSaving(false);

      if (error) {
        console.error('Insert error:', error);
        setError('Failed to save announcement.');
      } else {
        setSuccess(true);
        resetForm();
        fetchAnnouncements();
      }
    }
  };

  /**
   * Trigger confirmation modal and mark ID to delete
   */
  const handleDelete = async (): Promise<void> => {
    if (!pendingDeleteId) return;

    const { error } = await supabase.from('announcements').delete().eq('id', pendingDeleteId);
    if (error) {
      setError('Failed to delete announcement.');
    } else {
      setError(null);
      fetchAnnouncements();
    }

    setPendingDeleteId(null);
    setShowConfirmDelete(false);
  };

  /**
   * Begin editing an existing announcement
   */
  const startEdit = (announcement: Announcement): void => {
    setEditingId(announcement.id);
    setMessage(announcement.message);
    setStartDate(announcement.start_date);
    setEndDate(announcement.end_date);
    setType(announcement.announcement_type);
  };

  /**
   * Clear all form fields
   */
  const resetForm = (): void => {
    setEditingId(null);
    setMessage('');
    setStartDate('');
    setEndDate('');
    setType('info');
    setError(null);
    setSuccess(false);
  };

  /**
   * Preview box styling based on selected alert type
   */
  const getPreviewStyle = (): React.CSSProperties => {
    switch (type) {
      case 'info':
        return {
          backgroundColor: 'var(--bs-info-bg-subtle)',
          color: 'var(--bs-info-text-emphasis)',
          padding: '1rem',
          borderRadius: '6px',
          border: '1px solid var(--bs-info-border-subtle)',
        };
      case 'warning':
        return {
          backgroundColor: 'var(--bs-warning-bg-subtle)',
          color: 'var(--bs-warning-text-emphasis)',
          padding: '1rem',
          borderRadius: '6px',
          border: '1px solid var(--bs-warning-border-subtle)',
        };
      case 'danger':
        return {
          backgroundColor: 'var(--bs-danger-bg-subtle)',
          color: 'var(--bs-danger-text-emphasis)',
          padding: '1rem',
          borderRadius: '6px',
          border: '1px solid var(--bs-danger-border-subtle)',
        };
      default:
        return {
          backgroundColor: 'var(--bs-secondary-bg)',
          color: 'var(--bs-body-color)',
          padding: '1rem',
          borderRadius: '6px',
        };
    }
  };

  // -------------------
  // UI
  // -------------------

  return (
    <div className='p-3 rounded bg-body-secondary'>
      <div className='card shadow-sm p-3 rounded border-0 bg-body'>
        <div className='card-header bg-body border-bottom pb-2'>
          <h5 className='m-0 text-body'>{editingId ? 'Edit Announcement' : 'Create System Announcement'}</h5>
        </div>

        <div className='card-body px-2'>
          {/* Markdown Editor */}
          <div className='mb-3'>
            <label className='form-label'>Announcement Message (Markdown Supported)</label>
            <div data-color-mode='light'>
              <MDEditor
                value={message}
                onChange={(val) => setMessage(val || '')}
                height={200}
                preview='edit'
                hideToolbar={true}
              />
            </div>
          </div>

          {/* Live Preview */}
          {message && (
            <div className='mb-3'>
              <label className='form-label'>Preview</label>
              <MarkdownPreview source={mdParser.render(message)} style={getPreviewStyle()} />
            </div>
          )}

          {/* Form Fields */}
          <div className='row mb-3'>
            <div className='col-md-4'>
              <label htmlFor='announcement-type' className='form-label'>Type</label>
              <select
                id='announcement-type'
                className='form-select'
                value={type}
                onChange={(e) => setType(e.target.value as Announcement['announcement_type'])}
              >
                <option value='info'>Info</option>
                <option value='warning'>Warning</option>
                <option value='danger'>Danger</option>
              </select>
            </div>
            <div className='col-md-4'>
              <label htmlFor='start-date' className='form-label'>Start Date</label>
              <input
                id='start-date'
                type='datetime-local'
                className='form-control'
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className='col-md-4'>
              <label htmlFor='end-date' className='form-label'>End Date</label>
              <input
                id='end-date'
                type='datetime-local'
                className='form-control'
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Save + Clear */}
          <div className='d-flex justify-content-between gap-3'>
            <button className='btn btn-primary flex-fill' onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update Announcement' : 'Save Announcement'}
            </button>
            <button className='btn btn-outline-secondary flex-fill' onClick={resetForm} disabled={saving}>
              Clear
            </button>
          </div>

          {/* Feedback */}
          {success && (
            <div className='alert alert-success mt-3'>
              <i className='bi bi-check-circle-fill me-2'></i> Announcement {editingId ? 'updated' : 'saved'}!
            </div>
          )}
          {error && (
            <div className='alert alert-danger mt-3'>
              <i className='bi bi-exclamation-triangle-fill me-2'></i> {error}
            </div>
          )}
        </div>
      </div>

      {/* Announcement List */}
      <div className='mt-4'>
        <h6 className='text-body'>Existing Announcements</h6>
        {announcements.length === 0 ? (
          <p className='text-muted'>No announcements found.</p>
        ) : (
          <ul className='list-group'>
            {announcements.map((a) => (
              <li key={a.id} className='list-group-item d-flex justify-content-between align-items-start'>
                <div>
                  <div className='fw-bold'>
                    {a.announcement_type.toUpperCase()} | {new Date(a.start_date).toLocaleString()} →{' '}
                    {new Date(a.end_date).toLocaleString()}
                  </div>
                  <div className='small text-muted'>
                    {a.message.slice(0, 100)}
                    {a.message.length > 100 && '…'}
                  </div>
                </div>
                <div className='ms-3'>
                  <button className='btn btn-sm btn-outline-primary me-2' onClick={() => startEdit(a)}>
                    <i className='bi bi-pencil'></i>
                  </button>
                  <button
                    className='btn btn-sm btn-outline-danger'
                    onClick={() => {
                      setPendingDeleteId(a.id);
                      setShowConfirmDelete(true);
                    }}
                  >
                    <i className='bi bi-trash'></i>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmDelete && (
        <div className='modal show fade' style={{ display: 'block' }} tabIndex={-1}>
          <div className='modal-dialog'>
            <div className='modal-content'>
              <div className='modal-header bg-danger text-white'>
                <h5 className='modal-title'>Confirm Deletion</h5>
                <button type='button' className='btn-close' onClick={() => setShowConfirmDelete(false)}></button>
              </div>
              <div className='modal-body'>
                <p>Are you sure you want to delete this announcement? This action cannot be undone.</p>
              </div>
              <div className='modal-footer'>
                <button className='btn btn-secondary' onClick={() => setShowConfirmDelete(false)}>
                  Cancel
                </button>
                <button className='btn btn-danger' onClick={handleDelete}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}