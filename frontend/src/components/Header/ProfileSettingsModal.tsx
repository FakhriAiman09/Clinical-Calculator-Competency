'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/context/UserContext';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface ProfileSettingsModalProps {
  show: boolean;
  onClose: () => void;
}

/**
 * ProfileSettingsModal component
 *
 * Bootstrap-styled modal rendered manually using React state only.
 * Provides editable display name, shows email, and saves to Supabase.
 * Instead of native alerts, this version uses a toast notification.
 */
const ProfileSettingsModal = ({ show, onClose }: ProfileSettingsModalProps) => {
  const { user, displayName, email } = useUser();
  const [editedDisplayName, setEditedDisplayName] = useState(displayName);
  // New state to hold toast notification information.
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Sync input state when context updates
  useEffect(() => {
    setEditedDisplayName(displayName);
  }, [displayName]);

  const isChanged = editedDisplayName !== displayName;

  // Save updated display name to Supabase, then show a toast instead of an alert.
  const handleSave = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase.from('profiles').update({ display_name: editedDisplayName }).eq('id', user.id);

      if (error) throw error;

      // Show a non-blocking toast notification.
      setToast({ message: 'Display name updated successfully!', type: 'success' });
      onClose();
      // Optionally reload page if needed.
      window.location.reload();
    } catch (err) {
      console.error('Failed to update display name:', err);
      setToast({ message: 'Failed to update display name.', type: 'error' });
    }
  }, [editedDisplayName, user, onClose]);

  // Automatically clear the toast after 3 seconds.
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Do not render if modal is not active
  if (!show) return null;

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1050 }}>
          <div
            className={`alert ${
              toast.type === 'success' ? 'alert-success' : 'alert-danger'
            } alert-dismissible fade show`}
            role='alert'
          >
            {toast.message}
          </div>
        </div>
      )}

      {/* Simulated Bootstrap modal backdrop */}
      <div className='modal-backdrop fade show'></div>

      {/* Bootstrap-styled modal controlled by React */}
      <div className='modal fade show d-block' tabIndex={-1} role='dialog' onClick={onClose}>
        <div className='modal-dialog' role='document' onClick={(e) => e.stopPropagation()}>
          <div className='modal-content'>
            <div className='modal-header'>
              <h5 className='modal-title'>Profile Settings</h5>
              <button type='button' className='btn-close' aria-label='Close' onClick={onClose}></button>
            </div>
            <div className='modal-body'>
              <form>
                <div className='mb-3'>
                  <label htmlFor='displayName' className='form-label'>
                    Display Name
                  </label>
                  <input
                    type='text'
                    className='form-control'
                    id='displayName'
                    value={editedDisplayName}
                    onChange={(e) => setEditedDisplayName(e.target.value)}
                  />
                </div>
                <div className='mb-3'>
                  <label htmlFor='email' className='form-label'>
                    Email
                  </label>
                  <input type='email' className='form-control' id='email' value={email} disabled />
                </div>
              </form>
            </div>
            <div className='modal-footer'>
              <button className='btn btn-secondary' onClick={onClose}>
                Close
              </button>
              <button className='btn btn-primary' onClick={handleSave} disabled={!isChanged}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileSettingsModal;
