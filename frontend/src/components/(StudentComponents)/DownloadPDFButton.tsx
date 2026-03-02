'use client';

import React, { useState } from 'react';

interface DownloadPDFButtonProps {
  studentId?: string;
  reportId?: string;
  reportTitle?: string;
}

const DownloadPDFButton: React.FC<DownloadPDFButtonProps> = ({ studentId, reportId, reportTitle }) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!studentId || !reportId) {
      window.open('/dashboard/print-report', '_blank');
      return;
    }
    setDownloading(true);
    try {
      const res = await fetch(`/api/generate-pdf?studentId=${studentId}&reportId=${reportId}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportTitle || 'competency-report'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[DownloadPDFButton]', err);
      alert('PDF generation failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className='text-end d-print-none mb-3'>
      <button
        className='btn btn-success'
        onClick={handleDownload}
        disabled={downloading}
        style={{ minWidth: 140, opacity: downloading ? 0.7 : 1 }}
      >
        {downloading ? (
          <>
            <span className='spinner-border spinner-border-sm me-2' role='status' aria-hidden='true' />
            Generating…
          </>
        ) : (
          '⬇ Download PDF'
        )}
      </button>
    </div>
  );
};

export default DownloadPDFButton;