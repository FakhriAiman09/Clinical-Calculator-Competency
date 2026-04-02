'use client';

import React, { useState } from 'react';
import {
  buildCsvUrl,
  buildPrintReportUrl,
  hasRequiredReportParams,
  parseCsvFilename,
} from '@/utils/report-export-utils';

interface PrintPDFButtonProps {
  studentId?: string;
  reportId?: string;
  reportTitle?: string;
  returnUrl?: string; // where Back button should go
}

const PrintPDFButton: React.FC<PrintPDFButtonProps> = ({ studentId, reportId, reportTitle, returnUrl }) => {
  const [printing, setPrinting] = useState(false);
  const [generatingCsv, setGeneratingCsv] = useState(false);

  const handlePrint = () => {
    if (!hasRequiredReportParams(studentId, reportId)) {
      window.open('/dashboard/print-report', '_blank');
      return;
    }

    setPrinting(true);

    // Pass 'from' so the Back button in print-report knows where to return
    const from = returnUrl || window.location.pathname;
    const url = buildPrintReportUrl(studentId, reportId, from);
    const win = window.open(url, '_blank');

    if (win) {
      setTimeout(() => setPrinting(false), 4000);
    } else {
      // Popup blocked — navigate in same tab
      setPrinting(false);
      window.location.href = url;
    }
  };

  const handleExportCSV = async () => {
    if (!hasRequiredReportParams(studentId, reportId)) {
      alert('Cannot export CSV: missing student or report information.');
      return;
    }
    setGeneratingCsv(true);
    try {
      const res = await fetch(buildCsvUrl(studentId, reportId));
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const disposition = res.headers.get('Content-Disposition');
      const filename = parseCsvFilename(disposition, reportId);

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
        onClick={handlePrint}
        disabled={printing}
        style={{ minWidth: 140, opacity: printing ? 0.7 : 1 }}
        title={`Print report${reportTitle ? ': ' + reportTitle : ''}`}
      >
        {printing ? (
          <>
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
            Opening...
          </>
        ) : (
          <>
            <i className="bi bi-printer" aria-hidden="true"></i>
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