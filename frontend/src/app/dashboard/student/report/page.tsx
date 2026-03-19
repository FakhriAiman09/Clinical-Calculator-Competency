'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getEPAKFDescs } from '@/utils/get-epa-data';
import { useRequireRole } from '@/utils/useRequiredRole';
import { useUser } from '@/context/UserContext';
import dynamic from 'next/dynamic';
import DownloadPDFButton from '@/components/(StudentComponents)/PrintPDFButton';

const EPABox = dynamic(() => import('@/components/(StudentComponents)/EPABox'), { ssr: false });

const supabase = createClient();

interface StudentReport {
  id: string;
  user_id: string;
  title: string;
  time_window: '3m' | '6m' | '12m';
  report_data: Record<string, number>;
  llm_feedback: string | null;
  created_at: string;
}

const REPORT_EPAS = Array.from({ length: 13 }, (_, i) => i + 1);

export default function StudentReportPage() {
  useRequireRole(['student', 'dev']);

  const { user, displayName } = useUser();

  const [reports, setReports] = useState<StudentReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<StudentReport | null>(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [kfDescriptions, setKfDescriptions] = useState<Record<string, string[]> | null>(null);

  const fetchReports = useCallback(async (userId: string) => {
    setLoadingReports(true);
    const { data } = await supabase
      .from('student_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setReports(data ?? []);
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

  return (
    <div className="container py-5">
      <div className="card shadow-sm p-4 mt-5 mb-3">
        <h2 className="mb-1">My Comprehensive Report</h2>
        {displayName && <p className="text-muted mb-4">{displayName}</p>}

        {loadingReports ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading reports...</span>
            </div>
          </div>
        ) : reports.length === 0 ? (
          <div className="alert alert-info mb-0">
            No reports have been generated for your account yet. Please contact your administrator.
          </div>
        ) : (
          <>
            <h5 className="mb-3">Select a Report</h5>
            <ul className="list-group">
              {reports.map((r) => (
                <li
                  key={r.id}
                  className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
                    selectedReport?.id === r.id ? 'active' : ''
                  }`}
                  onClick={() => handleReportSelect(r)}
                  style={{ cursor: 'pointer' }}
                >
                  <span>
                    <strong>{r.title}</strong>
                    <span className="ms-2 badge bg-secondary">{r.time_window}</span>
                  </span>
                  <small className={selectedReport?.id === r.id ? 'text-white-50' : 'text-muted'}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </small>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {loadingReport && (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading report...</span>
          </div>
        </div>
      )}

      {user && selectedReport && !loadingReport && (
        <div className="pb-3 p-4 mb-5">
          <div className="d-flex justify-content-between align-items-center mb-3 d-print-none">
            <div>
              <h3 className="m-0">{selectedReport.title}</h3>
              <small className="text-muted">
                {selectedReport.time_window} window &middot; Generated{' '}
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
              timeRange={parseInt(selectedReport.time_window) as 3 | 6 | 12}
              kfDescriptions={kfDescriptions}
              studentId={user.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}