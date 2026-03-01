'use client';

import { lazy, Suspense, useEffect, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { createClient } from '@/utils/supabase/client';
import Markdown from '@uiw/react-markdown-preview';
import ProfileSettingsModal from '@/components/Header/ProfileSettingsModal';
import styles from './page.module.css';

type Announcement = {
  id: string;
  message: string;
  start_date: string;
  end_date: string;
  announcement_type: 'info' | 'warning' | 'danger';
};

const AdminDashboardPage = lazy(() => import('@/components/(AdminComponents)/adminDashboard'));
const RaterDashboard = lazy(() => import('@/components/(RaterComponents)/raterDashboard'));
const StudentDashboard = lazy(() => import('@/components/(StudentComponents)/studentDashboard'));

const Dashboard = () => {
  const { user, displayName, loading, userRoleAuthorized, userRoleRater, userRoleStudent, userRoleDev } = useUser();

  const [devView, setDevView] = useState<'admin' | 'rater' | 'student'>('admin');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [fadingIds, setFadingIds] = useState<string[]>([]);
  const [showNameModal, setShowNameModal] = useState(false);

  // Fetch system announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      const supabase = createClient();
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const formattedLocal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
        now.getHours()
      )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .lte('start_date', formattedLocal)
        .gte('end_date', formattedLocal)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Failed to fetch announcements:', error);
      } else {
        setAnnouncements(data as Announcement[]);
      }
    };

    fetchAnnouncements();
  }, []);

  // Handle dismissed announcement state
  useEffect(() => {
    const saved = sessionStorage.getItem('dismissedBannerIds');
    if (saved) {
      try {
        setDismissedIds(JSON.parse(saved));
      } catch {
        setDismissedIds([]);
      }
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('dismissedBannerIds', JSON.stringify(dismissedIds));
  }, [dismissedIds]);

  const handleDismiss = (id: string) => {
    setFadingIds((prev) => [...prev, id]);
    setTimeout(() => {
      setDismissedIds((prev) => [...prev, id]);
      setFadingIds((prev) => prev.filter((f) => f !== id));
    }, 300); // match Bootstrap fade animation duration
  };

  // Calculate whether the display name has been set (ignoring any whitespace)
  const mustSetDisplayName = !loading && user && !displayName.trim();

  const renderDashboard = () => {
    if (userRoleDev) {
      switch (devView) {
        case 'admin':
          return <AdminDashboardPage />;
        case 'rater':
          return <RaterDashboard />;
        case 'student':
          return <StudentDashboard />;
      }
    }

    if (userRoleAuthorized) {
      return <AdminDashboardPage />;
    } else if (userRoleRater) {
      return <RaterDashboard />;
    } else if (userRoleStudent) {
      return <StudentDashboard />;
    } else if (userRoleDev) {
      return (
        <>
          <AdminDashboardPage />
          <RaterDashboard />
          <StudentDashboard />
        </>
      );
    }

    return <p>No role assigned.</p>;
  };

  return (
    <main className='container mx-auto p-4'>
      {/* Persistent alert banner that will remain until a display name is set */}
      {mustSetDisplayName && (
        <div className='alert alert-warning d-flex justify-content-between align-items-center'>
          <span>
            <strong>Action required:</strong> please set a display name before continuing.
          </span>
          <button className='btn btn-sm btn-primary' onClick={() => setShowNameModal(true)}>
            Set now
          </button>
        </div>
      )}

      {/* Profile Settings Modal (triggered when clicking "Set now") */}
      <ProfileSettingsModal show={showNameModal} onClose={() => setShowNameModal(false)} />

      {/* System Announcements */}
      {announcements
        .filter((a) => !dismissedIds.includes(a.id))
        .map((a) => (
          <div
            key={a.id}
            className={`alert alert-${a.announcement_type} d-flex justify-content-between align-items-start mt-3 fade ${
              fadingIds.includes(a.id) ? 'show' : ''
            }`}
            role='alert'
            style={{
              whiteSpace: 'pre-wrap',
              opacity: fadingIds.includes(a.id) ? 0 : 1,
              transition: 'opacity 0.3s ease',
            }}
          >
            <div className='me-1' style={{ flex: 1 }}>
              <div className={styles.custom}>
                <Markdown source={a.message} />
              </div>
            </div>
            <button
              type='button'
              className='btn-close mt-1'
              aria-label='Close'
              onClick={() => handleDismiss(a.id)}
            ></button>
          </div>
        ))}

      {/* Greeting */}
      <p className='h5 mb-4'>Welcome, {displayName || 'friend'}</p>

      {/* Developer-only view toggle */}
      {userRoleDev && (
        <div className='mb-4'>
          <label htmlFor='devViewSelect' className='form-label'>
            Developer View:
          </label>
          <select
            id='devViewSelect'
            className='form-select w-auto'
            value={devView}
            onChange={(e) => setDevView(e.target.value as 'admin' | 'rater' | 'student')}
          >
            <option value='admin'>Admin Dashboard</option>
            <option value='rater'>Rater Dashboard</option>
            <option value='student'>Student Dashboard</option>
          </select>
        </div>
      )}

      {/* Lazy-loaded dashboard component */}
      <Suspense fallback={<div>Loading dashboard...</div>}>{renderDashboard()}</Suspense>
    </main>
  );
};

export default Dashboard;
