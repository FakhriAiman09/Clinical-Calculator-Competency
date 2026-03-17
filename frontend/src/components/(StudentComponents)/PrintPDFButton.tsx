'use client';

import React, { useState } from 'react';

interface PrintPDFButtonProps {
  studentId?: string;
  reportId?: string;
  reportTitle?: string;
}

const PrintPDFButton: React.FC<PrintPDFButtonProps> = ({ studentId, reportId, reportTitle }) => {
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingCsv, setGeneratingCsv] = useState(false);

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
    setGeneratingPdf(true);
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
      setGeneratingPdf(false);
    }
  };

  const handleExportCSV = async () => {
    if (!studentId || !reportId) {
      alert('Cannot export CSV: missing student or report information.');
      return;
    }
    setGeneratingCsv(true);
    try {
      const res = await fetch(`/api/generate-csv?studentId=${studentId}&reportId=${reportId}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const disposition = res.headers.get('Content-Disposition');
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `report-${reportId}.csv`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error('[PrintPDFButton CSV]', err);
      alert('CSV export failed. Please try again.');
    } finally {
      setGeneratingCsv(false);
    }
  };

  return (
    <div className="d-flex gap-2 d-print-none flex-wrap">
      <button
        className="btn btn-success d-flex align-items-center gap-2"
        onClick={handleViewAsPDF}
        disabled={generatingPdf}
        style={{ minWidth: 140, opacity: generatingPdf ? 0.7 : 1 }}
        title={`View as PDF${reportTitle ? ': ' + reportTitle : ''}`}
      >
        {generatingPdf ? (
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

      <button
        className="btn btn-outline-primary d-flex align-items-center gap-2"
        onClick={handleExportCSV}
        disabled={generatingCsv}
        style={{ minWidth: 140, opacity: generatingCsv ? 0.7 : 1 }}
        title={`Export as CSV${reportTitle ? ': ' + reportTitle : ''}`}
      >
        {generatingCsv ? (
          <>
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
            Exporting...
          </>
        ) : (
          <>
            <i className="bi bi-file-earmark-spreadsheet" aria-hidden="true"></i>
            Export CSV
          </>
        )}
      </button>
    </div>
  );
};

export default PrintPDFButton;