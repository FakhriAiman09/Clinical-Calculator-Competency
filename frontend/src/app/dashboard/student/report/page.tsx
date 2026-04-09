'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getEPAKFDescs } from '@/utils/get-epa-data';
import { useRequireRole } from '@/utils/useRequiredRole';
import { useUser } from '@/context/UserContext';
import dynamic from 'next/dynamic';
import DownloadPDFButton from '@/components/(StudentComponents)/PrintPDFButton';
import ReportGenerationForm from '@/components/(StudentComponents)/ReportGenerationForm';

const EPABox = dynamic(() => import('@/components/(StudentComponents)/EPABox'), { ssr: false });

const supabase = createClient();

interface StudentReport {
  id: string;
  user_id: string;
  title: string;
  time_window: string;
  report_data: Record<string, number>;
  llm_feedback: string | null;
  created_at: string;
}

const REPORT_EPAS = Array.from({ length: 13 }, (_, i) => i + 1);

function getTimeWindowMonths(timeWindow: string): 3 | 6 | 12 {
  const parsed = parseInt(timeWindow, 10);
  if (parsed === 6 || parsed === 12) return parsed;
  return 3;
}

function formatTimeWindowLabel(timeWindow: string): string {
  const months = getTimeWindowMonths(timeWindow);
  return `Last ${months} months`;
}

function getDisplayReportTitle(title: string): string {
  return title.replace(/\s*\((3m|6m|12m)\)\s*$/i, '').trim() || title;
}

export default function StudentReportPage() {
  useRequireRole(['student', 'dev']);

  const { user, displayName } = useUser();

  const [reports, setReports] = useState<StudentReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<StudentReport | null>(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [kfDescriptions, setKfDescriptions] = useState<Record<string, string[]> | null>(null);
  const [reportSearch, setReportSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState<3 | 6 | 12>(3);

  const fetchReports = useCallback(async (userId: string) => {
    setLoadingReports(true);
    const { data } = await supabase
      .from('student_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setReports(
      (data ?? []).map((report) => ({
        ...report,
        title: getDisplayReportTitle(report.title),
        time_window: formatTimeWindowLabel(report.time_window),
      }))
    );
    setLoadingReports(false);
  }, []);

  useEffect(() => {
    if (user?.id) fetchReports(user.id);
  }, [user, fetchReports]);

  useEffect(() => {
    getEPAKFDescs().then((descs) => {
      if (descs?.kf_desc) {
        const grouped: Record<string, string[]> = {};
        for (const key in descs.kf_desc) {
          const [epaIdRaw] = key.split('-');
          const epaId = String(parseInt(epaIdRaw, 10));
          if (!grouped[epaId]) grouped[epaId] = [];
          grouped[epaId].push(descs.kf_desc[key]);
        }
        setKfDescriptions(grouped);
      }
    });
  }, []);

  const handleReportSelect = (r: StudentReport) => {
    setLoadingReport(true);
    setSelectedReport(null);
    setTimeout(() => {
      setSelectedReport(r);
      setLoadingReport(false);
    }, 400);
  };

  const filteredReports = useMemo(() => {
    const search = reportSearch.trim().toLowerCase();
    const filterLabel = `Last ${timeFilter} months`;
    return reports.filter((r) =>
      (!search || r.title.toLowerCase().includes(search)) &&
      r.time_window === filterLabel
    );
  }, [reportSearch, timeFilter, reports]);

  return (
    <div className="container py-5">
      <style>{`
        .report-list-shell {
          border: 1px solid var(--bs-border-color, rgba(255,255,255,0.12));
          border-radius: 0.85rem;
          overflow: hidden;
          background: var(--bs-body-bg, transparent);
        }
        .report-list-scroll {
          max-height: 420px;
          overflow-y: auto;
        }
        .report-row {
          border: 0;
          border-bottom: 1px solid var(--bs-border-color, rgba(255,255,255,0.08));
          background: transparent;
        }
        .report-row:last-child {
          border-bottom: 0;
        }
        .report-meta {
          font-size: 0.85rem;
          color: var(--bs-secondary-color, #6c757d);
        }
      `}</style>

      {/* Generate New Report */}
      {user?.id && (
        <ReportGenerationForm
          studentId={user.id}
          timeRange={timeFilter}
          onGenerated={() => fetchReports(user.id)}
        />
      )}

      {/* Past Reports list */}
      <div className="card shadow-sm p-4 mt-4 mb-3">
        <h4 className="fw-semibold mb-3">Past Reports</h4>

        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search reports by name"
            value={reportSearch}
            onChange={(e) => setReportSearch(e.target.value)}
            style={{ maxWidth: 280 }}
          />
          <div className="btn-group" role="group" aria-label="Time range filter">
            {([3, 6, 12] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={`btn btn-outline-primary${timeFilter === value ? ' active' : ''}`}
                onClick={() => setTimeFilter(value)}
              >
                Last {value} mo
              </button>
            ))}
          </div>
        </div>

        {loadingReports ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading reports...</span>
            </div>
          </div>
        ) : reports.length === 0 ? (
          <div className="alert alert-info mb-0">
            No reports have been generated yet. Use the form above to generate your first report.
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="alert alert-secondary mb-0">
            No reports match the current filters.
          </div>
        ) : (
          <div className="report-list-shell shadow-sm">
            <div className="report-list-scroll">
              <ul className="list-group list-group-flush">
                {filteredReports.map((r) => (
                  <li
                    key={r.id}
                    className={`list-group-item list-group-item-action report-row ${
                      selectedReport?.id === r.id ? 'active' : ''
                    }`}
                    onClick={() => handleReportSelect(r)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="fw-semibold">{r.title}</div>
                    <div className={`report-meta mt-1 d-flex gap-2 ${selectedReport?.id === r.id ? 'text-white-50' : ''}`}>
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                      <span>&middot;</span>
                      <span>Time range: {r.time_window}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Loading spinner when switching reports */}
      {loadingReport && (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading report...</span>
          </div>
        </div>
      )}

      {/* Report viewer */}
      {user && selectedReport && !loadingReport && (
        <div className="pb-3 p-4 mb-5">
          <div className="d-flex justify-content-between align-items-center mb-3 d-print-none">
            <div>
              <h3 className="m-0">{selectedReport.title}</h3>
              <small className="text-muted">
                Time range: {selectedReport.time_window} &middot; Generated{' '}
                {new Date(selectedReport.created_at).toLocaleDateString()}
              </small>
            </div>
            <DownloadPDFButton
              studentId={user.id}
              reportId={selectedReport.id}
              reportTitle={selectedReport.title}
              returnUrl="/dashboard/student/report"
            />
          </div>

          <hr className="d-print-none" />

          {/* Print-only cover block */}
          <div style={{ display: 'none' }} className="print-cover">
            <style>{`
              @media print {
                .print-cover {
                  display: block !important;
                  border-bottom: 2pt solid #333;
                  padding-bottom: 10pt;
                  margin-bottom: 14pt;
                }
                .print-cover h1 { font-size: 14pt; font-weight: bold; margin: 0 0 4pt 0; }
                .print-cover .print-meta { font-size: 9pt; color: #444; display: flex; gap: 24pt; }
              }
            `}</style>
            <h1>{selectedReport.title}</h1>
            <div className="print-meta">
              <span><strong>Student:</strong> {displayName}</span>
              <span><strong>Time Window:</strong> {selectedReport.time_window}</span>
              <span><strong>Generated:</strong> {new Date(selectedReport.created_at).toLocaleDateString()}</span>
              <span><strong>Printed:</strong> {new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {REPORT_EPAS.map((epaId) => (
            <EPABox
              key={`epabox-${epaId}-${user.id}-${selectedReport.id}`}
              epaId={epaId}
              timeRange={getTimeWindowMonths(selectedReport.time_window)}
              kfDescriptions={kfDescriptions}
              studentId={user.id}
              reportId={selectedReport.id}
              reportCreatedAt={selectedReport.created_at}
            />
          ))}
        </div>
      )}
    </div>
  );
}
