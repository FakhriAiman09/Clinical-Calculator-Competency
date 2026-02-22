'use client';

import { useTheme, Theme } from '@/context/ThemeContext';
import { useState } from 'react';

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
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const handleThemeChange = async (t: Theme) => {
    setSaving(true);
    await setTheme(t);
    setSaving(false);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  return (
    <div className='container py-5' style={{ maxWidth: 720 }}>
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

      {/* ── Appearance ──────────────────────────────────────── */}
      <div className='card mb-4 shadow-sm'>
        <div className='card-header d-flex align-items-center gap-2 py-3'>
          <i className='bi bi-palette fs-5'></i>
          <span className='fw-semibold fs-6'>Appearance</span>
        </div>
        <div className='card-body py-4'>
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

          {theme === 'auto' && (
            <p className='text-muted mt-3 mb-0' style={{ fontSize: '0.85rem' }}>
              <i className='bi bi-info-circle me-1'></i>
              Currently displaying{' '}
              <strong>{resolvedTheme}</strong> mode based on your system settings.
            </p>
          )}
        </div>
      </div>

      {/* ── AI Preferences ──────────────────────────────────── */}
      <div className='card mb-4 shadow-sm'>
        <div className='card-header d-flex align-items-center justify-content-between py-3'>
          <div className='d-flex align-items-center gap-2'>
            <i className='bi bi-robot fs-5'></i>
            <span className='fw-semibold fs-6'>AI Preferences</span>
          </div>
          <span className='badge bg-secondary'>Coming Soon</span>
        </div>
        <div className='card-body py-4'>
          {/* Placeholder toggles — wired up once AI prefs are added to DB */}
          {[
            { label: 'Enable AI suggestions', sub: 'Show contextual AI hints during assessments' },
            { label: 'Auto-summarise reports', sub: 'Generate a short AI summary for each report' },
          ].map((item) => (
            <div
              key={item.label}
              className='d-flex justify-content-between align-items-center py-2 border-bottom'
            >
              <div>
                <div className='fw-medium'>{item.label}</div>
                <small className='text-muted'>{item.sub}</small>
              </div>
              <div className='form-check form-switch mb-0'>
                <input
                  className='form-check-input'
                  type='checkbox'
                  disabled
                  style={{ cursor: 'not-allowed', opacity: 0.5 }}
                />
              </div>
            </div>
          ))}
          <p className='text-muted mt-3 mb-0' style={{ fontSize: '0.85rem' }}>
            <i className='bi bi-hourglass-split me-1' />
            {' '}AI preference controls will be available in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}