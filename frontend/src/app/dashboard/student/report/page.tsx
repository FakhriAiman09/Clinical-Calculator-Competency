'use client';

import { useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useRequireRole } from '@/utils/useRequiredRole';
import { useUser } from '@/context/UserContext';
import ReportGenerationForm from '@/components/(StudentComponents)/ReportGenerationForm';
import { formatReportTimeWindowLabel } from '@/utils/epa-scoring';

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

function getDisplayReportTitle(title: string): string {
  const trimmed = title.trim();
  const suffixes = ['(3m)', '(6m)', '(12m)'];
  const matchedSuffix = suffixes.find((suffix) => trimmed.toLowerCase().endsWith(suffix));

  if (!matchedSuffix) {
    return trimmed || title;
  }

  return trimmed.slice(0, -matchedSuffix.length).trim() || title;
}

export default function StudentReportPage() {
  useRequireRole(['student', 'dev']);

  const { user } = useUser();

  const [reports, setReports] = useState<StudentReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
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
        time_window: formatReportTimeWindowLabel(report.time_window),
      }))
    );
    setLoadingReports(false);
  }, []);

  useEffect(() => {
    if (user?.id) fetchReports(user.id);
  }, [user, fetchReports]);

  const filteredReports = useMemo(() => {
    const search = reportSearch.trim().toLowerCase();
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - timeFilter);
    return reports.filter((r) =>
      (!search || r.title.toLowerCase().includes(search)) &&
      new Date(r.created_at) >= cutoff
    );
  }, [reportSearch, timeFilter, reports]);

  let reportListContent: ReactNode;
  if (loadingReports) {
    reportListContent = (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" aria-live="polite">
          <span className="visually-hidden">Loading reports...</span>
        </div>
      </div>
    );
  } else if (reports.length === 0) {
    reportListContent = (
      <div className="alert alert-info mb-0">
        No reports have been generated yet. Use the form above to generate your first report.
      </div>
    );
  } else if (filteredReports.length === 0) {
    reportListContent = (
      <div className="alert alert-secondary mb-0">
        No reports match the current filters.
      </div>
    );
  } else {
    reportListContent = (
      <div className="report-list-shell shadow-sm">
        <div className="report-list-scroll">
          <ul className="list-group list-group-flush">
            {filteredReports.map((r) => (
              <li key={r.id} className="list-group-item list-group-item-action report-row">
                <Link href={`/dashboard/student/report/${r.id}`} className="text-decoration-none d-block">
                  <span>{r.title} - {new Date(r.created_at).toLocaleDateString()}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

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
      `}</style>

      {user?.id && <ReportGenerationForm studentId={user.id} onGenerated={() => fetchReports(user.id)} />}

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
          <fieldset className="btn-group" aria-label="Time range filter">
            {([3, 6, 12] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={`btn btn-outline-secondary${timeFilter === value ? ' active' : ''}`}
                onClick={() => setTimeFilter(value)}
              >
                Last {value} mo
              </button>
            ))}
          </fieldset>
        </div>

        {reportListContent}
      </div>

    </div>
  );
}
