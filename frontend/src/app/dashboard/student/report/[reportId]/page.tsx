'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { createClient } from '@/utils/supabase/client';
import { getEPAKFDescs } from '@/utils/get-epa-data';
import { groupKfDescriptions } from '@/utils/report-response';
import { useRequireRole } from '@/utils/useRequiredRole';
import { useUser } from '@/context/UserContext';
import DownloadPDFButton from '@/components/(StudentComponents)/PrintPDFButton';
import { formatReportTimeWindowLabel, getReportTimeWindowMonths } from '@/utils/epa-scoring';

const EPABox = dynamic(() => import('@/components/(StudentComponents)/EPABox'), { ssr: false });
const supabase = createClient();
const REPORT_EPAS = Array.from({ length: 13 }, (_, i) => i + 1);

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

export default function StudentReportDetailPage() {
  useRequireRole(['student', 'dev']);

  const params = useParams();
  const routeReportId = useMemo(() => {
    const raw = params?.reportId;
    if (Array.isArray(raw)) return raw[0];
    return typeof raw === 'string' ? raw : undefined;
  }, [params]);

  const { user, displayName } = useUser();

  const [selectedReport, setSelectedReport] = useState<StudentReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [kfDescriptions, setKfDescriptions] = useState<Record<string, string[]> | null>(null);
  const [retryingAll, setRetryingAll] = useState(false);

  useEffect(() => {
    getEPAKFDescs().then((descs) => {
      if (descs?.kf_desc) {
        setKfDescriptions(groupKfDescriptions(descs.kf_desc));
      }
    });
  }, []);

  const fetchSelectedReport = useCallback(async () => {
    if (!user?.id || !routeReportId) {
      setLoadingReport(false);
      return;
    }

    setLoadingReport(true);
    const { data } = await supabase
      .from('student_reports')
      .select('*')
      .eq('id', routeReportId)
      .eq('user_id', user.id)
      .single();

    if (!data) {
      setSelectedReport(null);
      setLoadingReport(false);
      return;
    }

    setSelectedReport({
      ...data,
      title: getDisplayReportTitle(data.title),
      time_window: formatReportTimeWindowLabel(data.time_window),
    });
    setLoadingReport(false);
  }, [routeReportId, user?.id]);

  useEffect(() => {
    fetchSelectedReport();
  }, [fetchSelectedReport]);

  const handleRetryAll = async () => {
    if (!selectedReport) return;
    setRetryingAll(true);
    await supabase
      .from('student_reports')
      .update({ llm_feedback: 'Generating...' })
      .eq('id', selectedReport.id)
      .eq('user_id', selectedReport.user_id);
    setRetryingAll(false);
  };

  let reportDetailContent: JSX.Element;
  if (loadingReport) {
    reportDetailContent = (
      <div className="text-center my-5">
        <div className="spinner-border text-primary" aria-live="polite">
          <span className="visually-hidden">Loading report...</span>
        </div>
      </div>
    );
  } else if (!selectedReport) {
    reportDetailContent = (
      <div className="alert alert-warning mb-0">
        Report not found. It may have been removed or you may not have access.
      </div>
    );
  } else if (user) {
    reportDetailContent = (
      <div className="pb-3 p-4 mb-5">
        <div className="d-flex justify-content-between align-items-center mb-3 d-print-none">
          <div>
            <h3 className="m-0">{selectedReport.title}</h3>
            <small className="text-muted">
              Time range: {selectedReport.time_window} &middot; Generated{' '}
              {new Date(selectedReport.created_at).toLocaleDateString()}
            </small>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
              onClick={handleRetryAll}
              disabled={retryingAll}
              title="Retry AI summaries for all EPAs at once"
            >
              {retryingAll ? (
                <span className="spinner-border spinner-border-sm" aria-hidden="true" />
              ) : (
                <i className="bi bi-arrow-clockwise" aria-hidden="true" />
              )}
              {retryingAll ? 'Requesting...' : 'Retry All Summaries'}
            </button>
            <DownloadPDFButton
              studentId={user.id}
              reportId={selectedReport.id}
              reportTitle={selectedReport.title}
              returnUrl={`/dashboard/student/report/${selectedReport.id}`}
            />
          </div>
        </div>

        <hr className="d-print-none" />

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
            timeRange={getReportTimeWindowMonths(selectedReport.time_window)}
            kfDescriptions={kfDescriptions}
            studentId={user.id}
            reportId={selectedReport.id}
            reportCreatedAt={selectedReport.created_at}
          />
        ))}
      </div>
    );
  } else {
    reportDetailContent = <div className="alert alert-warning mb-0">Unable to load user session.</div>;
  }

  return (
    <div className="container py-5">
      <div className="d-flex align-items-center justify-content-between mb-3 d-print-none">
        <Link href="/dashboard/student/report" className="btn btn-outline-secondary btn-sm">
          Back to Reports
        </Link>
      </div>

      {reportDetailContent}
    </div>
  );
}
