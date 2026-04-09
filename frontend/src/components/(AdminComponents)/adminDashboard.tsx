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
      <div className='admin-dashboard-grid'>
        <div className='d-flex flex-column gap-3 min-w-0'>
          <AdminSettingsButtons />
        </div>

        <div className='min-w-0'>
          <AdminAnnouncements />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
