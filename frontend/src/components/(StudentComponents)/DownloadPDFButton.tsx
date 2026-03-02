'use client';

import React from 'react';

interface DownloadPDFButtonProps {
  studentId?: string;
  reportId?: string;
}

const DownloadPDFButton: React.FC<DownloadPDFButtonProps> = ({ studentId, reportId }) => {
  const handlePrint = () => {
    if (studentId && reportId) {
      // Open the dedicated print page in a new tab with student + report pre-selected
      const url = `/dashboard/print-report?studentId=${studentId}&reportId=${reportId}`;
      window.open(url, '_blank');
    } else {
      // Fallback: print current page (student-facing report page)
      window.print();
    }
  };

  return (
    <div className='text-end d-print-none mb-3'>
      <button className='btn btn-success' onClick={handlePrint}>
        Print Report
      </button>
    </div>
  );
};

export default DownloadPDFButton;