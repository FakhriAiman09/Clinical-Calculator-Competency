'use client';

import AdminAnnouncements from './AdminAnnouncements';
import AdminSettingsButtons from './AdminSettingsButtons';
import StatsTabsClient from './StatsTabsClient';

const AdminDashboardPage = () => {
  return (
    <div className='w-100 d-flex flex-column gap-4'>
      {/* 🔹 Full-width statistics component */}
      <div className='w-100'>
        <StatsTabsClient />
      </div>

      {/* 🔹 Two-column layout below stats */}
      <div className='d-flex flex-wrap flex-md-nowrap gap-3 w-100'>
        {/* Left column: notifications + settings */}
        <div className='d-flex flex-column gap-3 flex-grow-1' style={{ minWidth: '300px' }}>
          <AdminSettingsButtons />
        </div>

        {/* Right column: announcements */}
        <div className='flex-grow-1' style={{ minWidth: '500px' }}>
          <AdminAnnouncements />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
