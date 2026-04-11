'use client';

import { useTheme, Theme } from '@/context/ThemeContext';
import { useState, useCallback, useEffect } from 'react';
import AIPreferencesSection from '@/components/AIPreferencesSection';
import { useUser } from '@/context/UserContext';
import { createClient } from '@/utils/supabase/client';

interface ThemeOption {
  value: Theme;
  label: string;
  icon: string;
  description: string;
}

const themeOptions: ThemeOption[] = [
  {
    value: 'light',
    label: 'Light',
    icon: 'bi-sun-fill',
    description: 'Always use light mode',
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: 'bi-moon-stars-fill',
    description: 'Always use dark mode',
  },
  {
    value: 'auto',
    label: 'Auto',
    icon: 'bi-circle-half',
    description: 'Follow system setting',
  },
];

/**
 * SettingsPage
 *
 * Displays all user-configurable settings:
 * - Appearance (theme: light / dark / auto)
 * - AI Preferences (coming soon)
 */
export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { user, displayName, email, userRoleRater, userRoleDev } = useUser();
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [editedDisplayName, setEditedDisplayName] = useState(displayName);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordResetSending, setPasswordResetSending] = useState(false);
  const [passwordResetResult, setPasswordResetResult] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null);
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    setEditedDisplayName(displayName);
  }, [displayName]);

  useEffect(() => {
    setThemeReady(true);
  }, []);

  const isChanged = editedDisplayName !== displayName;

  const handleThemeChange = async (t: Theme) => {
    setSaving(true);
    await setTheme(t);
    setSaving(false);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const handleProfileSave = useCallback(async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('profiles').update({ display_name: editedDisplayName }).eq('id', user.id);
      if (error) throw error;
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
      window.location.reload();
    } catch (err) {
      console.error('Failed to update display name:', err);
    } finally {
      setProfileSaving(false);
    }
  }, [editedDisplayName, user]);

  const handlePasswordReset = useCallback(async () => {
    if (!email) return;

    setPasswordResetSending(true);
    setPasswordResetResult(null);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/login?reset=true`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;

      setPasswordResetResult({
        tone: 'success',
        message: 'Password reset email sent. Check your inbox and spam folder.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error sending recovery email.';
      setPasswordResetResult({ tone: 'danger', message });
    } finally {
      setPasswordResetSending(false);
    }
  }, [email]);

  return (
    <div className='container py-5' style={{ maxWidth: 900 }}>
      {/* Toast */}
      {savedToast && (
        <div
          style={{ position: 'fixed', top: 80, right: 24, zIndex: 1055 }}
          className='alert alert-success alert-dismissible fade show py-2 px-3 shadow-sm'
          role='alert'
        >
          <i className='bi bi-check-circle-fill me-2'></i>
          {' '}Preference saved
        </div>
      )}

      <h2 className='fw-bold mb-1'>Settings</h2>
      <p className='text-muted mb-4'>Manage your account preferences.</p>

      {/* ── Profile ─────────────────────────────────────────── */}
      <div className='card mb-4 shadow-sm'>
        <div className='card-header d-flex align-items-center gap-2 py-3'>
          <i className='bi bi-person fs-5'></i>
          <span className='fw-semibold fs-6'>Profile</span>
        </div>
        <div className='card-body py-4'>
          <div className='mb-3'>
            <label htmlFor='displayName' className='form-label fw-medium'>Display Name</label>
            <input
              type='text'
              className='form-control'
              id='displayName'
              value={editedDisplayName}
              onChange={(e) => setEditedDisplayName(e.target.value)}
            />
          </div>
          <div className='mb-4'>
            <label htmlFor='email' className='form-label fw-medium'>Email</label>
            <input type='email' className='form-control' id='email' value={email} disabled />
          </div>
          <button
            className='btn btn-primary'
            onClick={handleProfileSave}
            disabled={!isChanged || profileSaving}
          >
            {profileSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* ── Appearance ──────────────────────────────────────── */}
      <div className='card mb-4 shadow-sm'>
        <div className='card-header d-flex align-items-center gap-2 py-3'>
          <i className='bi bi-shield-lock fs-5'></i>
          <span className='fw-semibold fs-6'>Password</span>
        </div>
        <div className='card-body py-4'>
          <p className='text-muted mb-3'>
            Send a password reset link to <strong>{email || 'your email address'}</strong>.
          </p>

          {passwordResetResult ? (
            <div className={`alert alert-${passwordResetResult.tone} py-2 px-3`} role='alert'>
              {passwordResetResult.message}
            </div>
          ) : null}

          <button
            className='btn btn-outline-primary'
            onClick={handlePasswordReset}
            disabled={!email || passwordResetSending}
          >
            {passwordResetSending ? 'Sending...' : 'Send password reset email'}
          </button>
        </div>
      </div>

      <div className='card mb-4 shadow-sm'>
        <div className='card-header d-flex align-items-center gap-2 py-3'>
          <i className='bi bi-palette fs-5'></i>
          <span className='fw-semibold fs-6'>Appearance</span>
        </div>
        <div className='card-body py-4'>
          {!themeReady ? (
            <p className='text-muted mb-0'>Loading theme preference...</p>
          ) : (
          <fieldset>
            <legend className='form-label fw-medium mb-3'>Theme</legend>
            <div className='d-flex gap-3 flex-wrap'>
            {themeOptions.map((opt) => {
              const isActive = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleThemeChange(opt.value)}
                  disabled={saving}
                  className={`btn d-flex flex-column align-items-center gap-1 px-4 py-3 ${
                    isActive ? 'btn-primary' : 'btn-outline-secondary'
                  }`}
                  style={{ minWidth: 100, transition: 'all 0.15s ease' }}
                >
                  <i className={`bi ${opt.icon} fs-4`}></i>
                  <span className='fw-medium'>{opt.label}</span>
                  <small
                    className={`${isActive ? 'text-white-50' : 'text-muted'}`}
                    style={{ fontSize: '0.72rem' }}
                  >
                    {opt.description}
                  </small>
                </button>
              );
            })}
            </div>
          </fieldset>
          )}

          {themeReady && theme === 'auto' && (
            <p className='text-muted mt-3 mb-0' style={{ fontSize: '0.85rem' }}>
              <i className='bi bi-info-circle me-1'></i>
              Currently displaying{' '}
              <strong>{resolvedTheme}</strong> mode based on your system settings.
            </p>
          )}
        </div>
      </div>

      {/* ── AI Preferences — rater and dev only ─────────────── */}
      {(userRoleRater || userRoleDev) && <AIPreferencesSection />}
    </div>
  );
}
