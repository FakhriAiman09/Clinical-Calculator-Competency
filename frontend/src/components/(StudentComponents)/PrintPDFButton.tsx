'use client';

import React, { useState } from 'react';

interface PrintPDFButtonProps {
  studentId?: string;
  reportId?: string;
  reportTitle?: string;
}

const PrintPDFButton: React.FC<PrintPDFButtonProps> = ({ studentId, reportId, reportTitle }) => {
  const [generating, setGenerating] = useState(false);

  const handlePrint = () => {
    if (!studentId || !reportId) {
      window.open('/dashboard/print-report', '_blank');
      return;
    }
    const url = `/dashboard/print-report?studentId=${studentId}&reportId=${reportId}`;
    const win = window.open(url, '_blank');
    if (win) {
      win.addEventListener('load', () => {
        win.focus();
        win.print();
      });
    }
  };

  const handleViewAsPDF = async () => {
    if (!studentId || !reportId) {
      window.open('/dashboard/print-report', '_blank');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch(`/api/generate-pdf?studentId=${studentId}&reportId=${reportId}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error('[PrintPDFButton]', err);
      alert('PDF generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="d-flex gap-2 d-print-none">
      <button
        className="btn btn-outline-secondary d-flex align-items-center gap-2"
        onClick={handlePrint}
        title={`Print report${reportTitle ? ': ' + reportTitle : ''}`}
      >
        <i className="bi bi-printer" aria-hidden="true"></i>
        Print PDF
      </button>
      <button
        className="btn btn-success d-flex align-items-center gap-2"
        onClick={handleViewAsPDF}
        disabled={generating}
        style={{ minWidth: 140, opacity: generating ? 0.7 : 1 }}
        title={`View as PDF${reportTitle ? ': ' + reportTitle : ''}`}
      >
        {generating ? (
          <>
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
            Generating...
          </>
        ) : (
          <>
            <i className="bi bi-file-earmark-pdf" aria-hidden="true"></i>
            View as PDF
          </>
        )}
      </button>
    </div>
  );
};

export default PrintPDFButton;