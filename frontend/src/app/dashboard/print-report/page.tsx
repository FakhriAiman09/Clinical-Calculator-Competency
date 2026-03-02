'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { getEPAKFDescs } from '@/utils/get-epa-data';
import { useRequireRole } from '@/utils/useRequiredRole';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const LOGO_SRC = "data:image/jpeg;base64,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";

const supabase = createClient();

const REPORT_EPAS = Array.from({ length: 13 }, (_, i) => i + 1);
const DEV_LABELS = ['Remedial', 'Early-Developing', 'Developing', 'Entrustable'];
const devLabel = (val: number | null | undefined) =>
  val == null ? '—' : DEV_LABELS[Math.floor(val)] ?? '—';

/* Annotate raw numbers in AI text with their level labels */
function annotateScores(text: string): string {
  // Replace patterns like "2.0625" or "Score: 1.375" with "2.0625 (Developing)"
  return text.replace(/\b(\d+\.\d+)\b/g, (match) => {
    const num = parseFloat(match);
    if (num >= 0 && num <= 3.99) {
      const label = DEV_LABELS[Math.floor(num)];
      if (label) return `${match} (${label})`;
    }
    return match;
  });
}

/* Strip CSV artifacts: surrounding quotes and trailing commas */
function sanitize(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/^["']|["']$/g, '')   // remove surrounding quotes
    .replace(/,+$/, '')             // remove trailing commas
    .replace(/["]{2,}/g, '"')       // collapse escaped CSV double-quotes
    .trim();
}

/* ─── Types ─────────────────────────────────────────────── */
interface Student {
  id: string;
  display_name: string;
}

interface StudentReport {
  id: string;
  user_id: string;
  title: string;
  time_window: '3m' | '6m' | '12m';
  report_data: Record<string, number>;
  kf_avg_data: Record<string, number> | null;
  llm_feedback: string | null;
  created_at: string;
}

interface Assessment {
  keyFunctionId: string;
  devLevel: number;
  date: string;
  setting: string | null;
}

interface EPAData {
  epaId: number;
  title: string;
  assessments: Assessment[];
  comments: string[];
  kfAverages: Record<string, number>;
  epaAverage: number | null;
  lifetimeAverage: number | null;
  llmFeedback: string | null;
}

/* ─── Badge Component ───────────────────────────────────── */
function DevBadge({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="badge-none">No data</span>;
  const level = Math.floor(value);
  const label = DEV_LABELS[level] ?? '—';
  const classes = ['badge-remedial', 'badge-early', 'badge-developing', 'badge-entrustable'];
  return <span className={`dev-badge ${classes[level] ?? ''}`}>{label}</span>;
}

/* ─── Main component ────────────────────────────────────── */
export default function PrintReportPage() {
  useRequireRole(['admin', 'dev', 'student']);

  const searchParams = useSearchParams();
  const paramStudentId = searchParams.get('studentId');
  const paramReportId = searchParams.get('reportId');

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<StudentReport | null>(null);
  const [epaDataList, setEpaDataList] = useState<EPAData[]>([]);
  const [kfDescriptions, setKfDescriptions] = useState<Record<string, string[]>>({});
  const [epaDescriptions, setEpaDescriptions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [forceSelector, setForceSelector] = useState(false);
  const [downloading, setDownloading] = useState(false);

  /* Load students */
  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'student');
      const ids = roles?.map((r) => r.user_id) ?? [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', ids)
        .eq('account_status', 'Active');
      setStudents((profiles ?? []).map((p) => ({ id: p.id, display_name: sanitize(p.display_name) || 'Unnamed' })));
    })();
  }, []);

  /* Load EPA/KF descriptions */
  useEffect(() => {
    (async () => {
      const descs = await getEPAKFDescs();
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
      if (descs?.epa_desc) {
        setEpaDescriptions(descs.epa_desc as Record<string, string>);
      }
    })();
  }, []);

  /* Load reports when student selected */
  const loadReports = useCallback(async (studentId: string) => {
    const { data } = await supabase
      .from('student_reports')
      .select('*')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false });
    setReports(data ?? []);
  }, []);

  /* Auto-load when arriving from all-reports page via query params */
  useEffect(() => {
    if (!paramStudentId || !paramReportId) return;
    if (Object.keys(epaDescriptions).length === 0) return;

    (async () => {
      setLoading(true);

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('id', paramStudentId)
        .single();

      if (!profile) { setLoading(false); return; }
      const student: Student = { id: profile.id, display_name: profile.display_name ?? 'Unnamed' };

      const { data: report } = await supabase
        .from('student_reports')
        .select('*')
        .eq('id', paramReportId)
        .single();

      if (!report) { setLoading(false); return; }

      setSelectedStudent(student);
      setSelectedReport(report);

      await buildReport(student, report);

      setTimeout(() => window.print(), 800);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramStudentId, paramReportId, epaDescriptions]);

  /* Build EPA data from Supabase when report selected */
  const buildReport = useCallback(async (student: Student, report: StudentReport) => {
    setLoading(true);
    setReady(false);

    const timeRange = parseInt(report.time_window);
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - timeRange);

    const { data: resultRows } = await supabase
      .from('form_results')
      .select(`
        created_at,
        results,
        form_responses:form_responses!form_results_response_id_fkey (
          response,
          form_requests:form_requests!form_responses_request_id_fkey (
            student_id,
            clinical_settings
          )
        )
      `)
      .returns<{
        created_at: string;
        results: Record<string, number>;
        form_responses: {
          response?: { response?: Record<string, Record<string, { text?: string[] }>> };
          form_requests: { student_id: string; clinical_settings?: string };
        };
      }[]>();

    let feedbackObj: Record<string, string> | null = null;
    if (report.llm_feedback) {
      if (typeof report.llm_feedback === 'object') {
        feedbackObj = report.llm_feedback as Record<string, string>;
      } else {
        try { feedbackObj = JSON.parse(report.llm_feedback); } catch { feedbackObj = null; }
      }
    }

    const built: EPAData[] = REPORT_EPAS.map((epaId) => {
      const epaStr = String(epaId);
      const assessments: Assessment[] = [];
      const comments: string[] = [];

      for (const row of resultRows ?? []) {
        const fr = row.form_responses;
        if (fr?.form_requests?.student_id !== student.id) continue;

        for (const [kfKey, level] of Object.entries(row.results)) {
          const [epaKey, kfNum] = kfKey.split('.');
          if (parseInt(epaKey) === epaId) {
            assessments.push({
              keyFunctionId: `kf${kfNum}`,
              devLevel: level,
              date: row.created_at,
              setting: fr.form_requests?.clinical_settings ?? null,
            });
          }
        }

        const commentBlock = fr.response?.response?.[epaStr];
        if (commentBlock) {
          Object.values(commentBlock).forEach((kfObj) => {
            if (kfObj?.text && Array.isArray(kfObj.text)) {
              comments.push(...kfObj.text.filter((t) => typeof t === 'string' && t.trim() !== ''));
            }
          });
        }
      }

      const kfAverages: Record<string, number> = {};
      const epaKfScores: number[] = [];
      if (report.kf_avg_data) {
        for (const [key, val] of Object.entries(report.kf_avg_data)) {
          if (key.startsWith(`${epaId}.`) && typeof val === 'number') {
            const kfId = `kf${key.split('.')[1]}`;
            kfAverages[kfId] = val;
            epaKfScores.push(val);
          }
        }
      }

      const epaAverage =
        epaKfScores.length > 0
          ? Math.floor(epaKfScores.reduce((a, b) => a + b, 0) / epaKfScores.length)
          : null;

      const allScores = assessments.map((a) => a.devLevel).filter((v) => typeof v === 'number');
      const lifetimeAverage =
        allScores.length > 0
          ? Math.floor(allScores.reduce((a, b) => a + b, 0) / allScores.length)
          : null;

      const rawFeedback = feedbackObj
        ? Object.entries(feedbackObj)
            .filter(([key]) => parseInt(key.split('.')[0]) === epaId)
            .map(([, val]) => val)
            .filter(Boolean)
            .join('\n\n')
        : null;
      const relevantFeedback = rawFeedback ? annotateScores(rawFeedback) : null;

      const recentAssessments = assessments.filter((a) => new Date(a.date) >= cutoff);

      return {
        epaId,
        title: sanitize(epaDescriptions[epaStr]) || `EPA ${epaId}`,
        assessments: recentAssessments,
        comments: Array.from(new Set(comments)),
        kfAverages,
        epaAverage,
        lifetimeAverage,
        llmFeedback: relevantFeedback || null,
      };
    });

    setEpaDataList(built);
    setLoading(false);
    setReady(true);
  }, [epaDescriptions]);

  /* ─── PDF Download via Puppeteer API ─────────────────── */
  const downloadPdf = useCallback(async () => {
    if (!selectedStudent || !selectedReport) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/generate-pdf?studentId=${selectedStudent.id}&reportId=${selectedReport.id}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sanitize(selectedReport.title) || 'report'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[downloadPdf]', err);
      alert('PDF generation failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  }, [selectedStudent, selectedReport]);

  /* ─── Selector UI ─────────────────────────────────────── */
  if (!ready) {
    if (paramStudentId && paramReportId && !forceSelector) {
      return (
        <div className="loading-screen">
          <style>{styles}</style>
          <div className="loading-logo">
            <img src={LOGO_SRC} alt="CCC Logo" width={48} height={48} style={{borderRadius:12}} />
          </div>
          <div className="loading-spinner" />
          <p className="loading-text">Building report…</p>
        </div>
      );
    }
    return (
      <div className="selector-page">
        <style>{styles}</style>

        <div className="selector-header">
          <img src={LOGO_SRC} alt="CCC Logo" width={36} height={36} style={{borderRadius:8}} />
          <span className="selector-title">Clinical Competency Calculator</span>
        </div>

        <div className="selector-card">
          <h2 className="selector-heading">Generate PDF Report</h2>

          <div className="selector-field">
            <label className="selector-label">Student</label>
            <select
              className="selector-select"
              value={selectedStudent?.id ?? ''}
              onChange={(e) => {
                const s = students.find((x) => x.id === e.target.value) ?? null;
                setSelectedStudent(s);
                setSelectedReport(null);
                setReports([]);
                if (s) loadReports(s.id);
              }}
            >
              <option value=''>— Select student —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.display_name}</option>
              ))}
            </select>
          </div>

          {reports.length > 0 && (
            <div className="selector-field">
              <label className="selector-label">Report</label>
              <select
                className="selector-select"
                value={selectedReport?.id ?? ''}
                onChange={(e) => {
                  const r = reports.find((x) => x.id === e.target.value) ?? null;
                  setSelectedReport(r);
                }}
              >
                <option value=''>— Select report —</option>
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} — {new Date(r.created_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedStudent && selectedReport && (
            <button
              className="selector-btn"
              disabled={loading}
              onClick={() => buildReport(selectedStudent, selectedReport)}
            >
              {loading ? 'Building report…' : 'Build Report'}
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ─── Print Report ────────────────────────────────────── */
  const printDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const reportDate = selectedReport
    ? new Date(selectedReport.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div className="print-root">
      <style>{styles}</style>

      {/* ── Global print header (fixed, repeats on every printed page) ── */}
      <div className="global-print-header">
        <div className="page-header-left">
          <img src={LOGO_SRC} alt="CCC Logo" width={18} height={18} className="page-header-logo" style={{borderRadius:3, flexShrink:0}} />
          <span className="page-header-brand">Clinical Competency Calculator</span>
          <strong>{sanitize(selectedStudent?.display_name)}</strong>
          <span className="header-sep">&mdash;</span>
          <span className="page-header-report">{sanitize(selectedReport?.title)}</span>
        </div>
        <div className="page-header-right">Printed: {printDate}</div>
      </div>

      {/* ── Screen toolbar ── */}
      <div className="screen-toolbar no-print">
        <button className="toolbar-back-btn" onClick={() => { setReady(false); setForceSelector(true); }}>← Back</button>
        <div className="toolbar-center">
          <img src={LOGO_SRC} alt="CCC" width={24} height={24} style={{borderRadius:6}} />
          <span className="toolbar-title">{sanitize(selectedReport?.title)}</span>
        </div>
        <button
          className="toolbar-print-btn"
          onClick={downloadPdf}
          disabled={downloading}
          style={{ opacity: downloading ? 0.7 : 1 }}
        >
          {downloading ? '⏳ Generating…' : '⬇ Download PDF'}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          COVER PAGE
          ══════════════════════════════════════════════════ */}
      <div className="rpt-page rpt-cover">
        <div className="cover-content">
          {/* Logo + Brand */}
          <div className="cover-brand">
            <div className="cover-logo-wrap">
              <img src={LOGO_SRC} alt="Clinical Competency Calculator Logo" width={72} height={72} className="cover-logo-img" />
            </div>
            <div className="cover-brand-text">
              <div className="cover-brand-name">Clinical Competency Calculator</div>
              <div className="cover-brand-abbr">Assessment Platform</div>
            </div>
          </div>

          {/* Divider */}
          <div className="cover-divider" />

          {/* Report title */}
          <div className="cover-title-section">
            <div className="cover-report-label">COMPETENCY REPORT</div>
            <h1 className="cover-report-title">{sanitize(selectedReport?.title)}</h1>
          </div>

          {/* Meta table */}
          <div className="cover-meta-grid">
            <div className="cover-meta-item">
              <div className="cover-meta-label">Student</div>
              <div className="cover-meta-value">{sanitize(selectedStudent?.display_name)}</div>
            </div>
            <div className="cover-meta-item">
              <div className="cover-meta-label">Report Generated</div>
              <div className="cover-meta-value">{reportDate}</div>
            </div>
            <div className="cover-meta-item">
              <div className="cover-meta-label">Printed</div>
              <div className="cover-meta-value">{printDate}</div>
            </div>
            <div className="cover-meta-item">
              <div className="cover-meta-label">Total EPAs</div>
              <div className="cover-meta-value">{REPORT_EPAS.length}</div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="cover-footer">
          This is an unofficial working copy of a student&apos;s EPA competency progress.
          Results are subject to review by a supervising faculty member.
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          SUMMARY PAGE
          ══════════════════════════════════════════════════ */}
      <div className="rpt-page rpt-summary-page">

        <h2 className="section-title">EPA Summary</h2>
        <p className="section-note">
          Development levels: &nbsp;
          <span className="dev-badge badge-remedial">Remedial</span>&nbsp;
          <span className="dev-badge badge-early">Early-Developing</span>&nbsp;
          <span className="dev-badge badge-developing">Developing</span>&nbsp;
          <span className="dev-badge badge-entrustable">Entrustable</span>
        </p>

        <table className="rpt-table summary-table">
          <thead>
            <tr>
              <th style={{ width: '5%' }}>#</th>
              <th style={{ width: '53%' }}>EPA Title</th>
              <th style={{ width: '18%' }}>Avg Level</th>
              <th style={{ width: '12%' }}>Assessments</th>
              <th style={{ width: '12%' }}>Comments</th>
            </tr>
          </thead>
          <tbody>
            {epaDataList.map((epa) => (
              <tr key={epa.epaId}>
                <td className="cell-center cell-muted">{epa.epaId}</td>
                <td className="cell-epa-title">{sanitize(epa.title)}</td>
                <td><DevBadge value={epa.epaAverage} /></td>
                <td className="cell-center">{new Set(epa.assessments.map((a) => a.date)).size}</td>
                <td className="cell-center">{epa.comments.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ══════════════════════════════════════════════════
          ONE PAGE PER EPA
          ══════════════════════════════════════════════════ */}
      {epaDataList.map((epa) => {
        const assessmentCount = new Set(epa.assessments.map((a) => a.date)).size;
        const settings = Array.from(new Set(epa.assessments.map((a) => a.setting).filter(Boolean)));
        const sortedDates = epa.assessments.map((a) => new Date(a.date)).sort((a, b) => b.getTime() - a.getTime());
        const lastDate = sortedDates[0];
        const daysSinceLast = lastDate
          ? Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return (
          <div key={epa.epaId} className="rpt-page rpt-epa-page">

            {/* EPA Banner */}
            <div className="epa-banner">
              <div className="epa-banner-id">EPA {epa.epaId}</div>
              <div className="epa-banner-title">{sanitize(epa.title)}</div>
              <div className="epa-banner-badge">
                <DevBadge value={epa.epaAverage} />
              </div>
            </div>

            {/* Stats row */}
            <div className="stats-row">
              <div className="stat-box">
                <div className="stat-label">Assessments</div>
                <div className="stat-value">{assessmentCount}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Days Since Last</div>
                <div className="stat-value">{daysSinceLast ?? '—'}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Lifetime Avg</div>
                <div className="stat-value stat-value-sm">
                  <DevBadge value={epa.lifetimeAverage} />
                </div>
              </div>
              <div className="stat-box stat-box-wide">
                <div className="stat-label">Settings</div>
                <div className="stat-value stat-value-sm">
                  {settings.length > 0 ? settings.join(', ') : '—'}
                </div>
              </div>
            </div>

            {/* Key Functions */}
            {(kfDescriptions[String(epa.epaId)] ?? []).length > 0 && (
              <div className="content-block">
                <div className="block-heading">Key Functions</div>
                <table className="rpt-table kf-table">
                  <thead>
                    <tr>
                      <th style={{ width: '5%' }}>KF</th>
                      <th>Description</th>
                      <th style={{ width: '20%' }}>Avg Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(kfDescriptions[String(epa.epaId)] ?? []).map((desc, idx) => {
                      const kfId = `kf${idx + 1}`;
                      const avg = epa.kfAverages[kfId];
                      return (
                        <tr key={kfId}>
                          <td className="cell-center cell-muted">{idx + 1}</td>
                          <td>{desc}</td>
                          <td>
                            {avg === undefined ? <span className="no-data">—</span> : <DevBadge value={avg} />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Comments — only rendered when there are comments */}
            {epa.comments.filter(c => c.trim().length > 2).length > 0 && (
              <div className="content-block">
                <div className="block-heading">
                  Comments <span className="block-count">({epa.comments.filter(c => c.trim().length > 2).length})</span>
                </div>
                <ul className="comments-list">
                  {epa.comments.filter(c => c.trim().length > 2).map((c, i) => (
                    <li key={i} className="comment-item">{sanitize(c)}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Feedback — only rendered when feedback exists */}
            {epa.llmFeedback && (
              <div className="content-block ai-block">
                <div className="ai-block-header">
                  <span className="ai-icon">&#10022;</span>
                  <span className="block-heading ai-block-title">
                    AI Summary &amp; Recommendations
                  </span>
                </div>
                <div className="ai-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {epa.llmFeedback}
                  </ReactMarkdown>
                </div>
              </div>
            )}

          </div>
        );
      })}

    </div>
  );
}

/* ─── Styles ────────────────────────────────────────────── */
const styles = `
  @charset "UTF-8";

  /* ── Global font safety: Helvetica/Arial only — prevents PDF Mojibake ── */
  *, *::before, *::after {
    font-family: Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /* ── Variables ── */
  :root {
    --navy: #1a3a6b;
    --navy-light: #2a4f8f;
    --navy-pale: #eef2f9;
    --accent-blue: #2563eb;
    --text-primary: #111827;
    --text-secondary: #6b7280;
    --text-muted: #9ca3af;
    --border: #e5e7eb;
    --border-strong: #d1d5db;
    --bg-page: #f1f5f9;
    --bg-card: #ffffff;
    --bg-stripe: #f8fafc;
    --radius: 6px;
    --shadow: 0 1px 3px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.07);
    --font-sans: Helvetica, Arial, sans-serif;
    --font-mono: 'Courier New', Courier, monospace;

    /* Badge colors */
    --badge-remedial-bg: #fef2f2;
    --badge-remedial-text: #991b1b;
    --badge-remedial-border: #fca5a5;
    --badge-early-bg: #fffbeb;
    --badge-early-text: #92400e;
    --badge-early-border: #fcd34d;
    --badge-developing-bg: #f0fdf4;
    --badge-developing-text: #166534;
    --badge-developing-border: #86efac;
    --badge-entrustable-bg: #ecfdf5;
    --badge-entrustable-text: #065f46;
    --badge-entrustable-border: #6ee7b7;
  }

  /* ── Loading & Selector (screen only) ── */
  .loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 16px;
    font-family: var(--font-sans);
  }
  .loading-spinner {
    width: 32px; height: 32px;
    border: 3px solid var(--border);
    border-top-color: var(--accent-blue);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-text { color: var(--text-secondary); font-size: 14px; }

  .selector-page {
    font-family: var(--font-sans);
    min-height: 100vh;
    background: var(--bg-page);
    padding: 48px 24px;
  }
  .selector-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 32px;
    max-width: 520px;
    margin-left: auto;
    margin-right: auto;
  }
  .selector-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--navy);
    letter-spacing: -0.01em;
  }
  .selector-card {
    background: white;
    border-radius: 12px;
    padding: 32px;
    max-width: 520px;
    margin: 0 auto;
    box-shadow: var(--shadow);
    border: 1px solid var(--border);
  }
  .selector-heading {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 24px;
  }
  .selector-field { margin-bottom: 20px; }
  .selector-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 8px;
  }
  .selector-select {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    font-size: 14px;
    color: var(--text-primary);
    background: white;
    appearance: auto;
    outline: none;
  }
  .selector-select:focus { border-color: var(--accent-blue); box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
  .selector-btn {
    width: 100%;
    padding: 12px;
    background: var(--navy);
    color: white;
    border: none;
    border-radius: var(--radius);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  .selector-btn:hover { background: var(--navy-light); }
  .selector-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  /* ── Screen toolbar ── */
  .screen-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 24px;
    background: white;
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    font-family: var(--font-sans);
  }
  .toolbar-back-btn {
    padding: 7px 14px;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius);
    background: white;
    font-size: 13px;
    cursor: pointer;
    color: var(--text-secondary);
  }
  .toolbar-center {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .toolbar-print-btn {
    padding: 8px 18px;
    background: var(--navy);
    color: white;
    border: none;
    border-radius: var(--radius);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  /* ── Print root (screen) ── */
  .print-root {
    font-family: var(--font-sans);
    font-size: 10pt;
    color: var(--text-primary);
    background: var(--bg-page);
    line-height: 1.5;
  }

  /* ── Each page ── */
  .rpt-page {
    background: white;
    width: 210mm;
    min-height: 297mm;
    margin: 24px auto;
    padding: 18mm 16mm;
    box-shadow: var(--shadow);
    border-radius: 2px;
    position: relative;
    box-sizing: border-box;
  }

  /* ── Global print header: hidden on screen ── */
  .global-print-header {
    display: none;
  }

  /* ── Page running header (screen only — summary page) ── */
  .rpt-page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8pt;
    color: var(--text-secondary);
    border-bottom: 1.5px solid var(--navy);
    padding-bottom: 6pt;
    margin-bottom: 14pt;
  }
  .page-header-left {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .page-header-logo { opacity: 0.7; }
  .page-header-brand {
    font-size: 7pt;
    font-weight: 800;
    color: var(--navy);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: var(--navy-pale);
    padding: 1pt 5pt;
    border-radius: 3px;
    margin-right: 2px;
  }
  .page-header-report {
    color: var(--text-secondary);
    font-size: 8pt;
    font-style: italic;
  }
  .header-sep { color: var(--text-muted); margin: 0 3px; }
  .page-header-right { color: var(--text-muted); }

  /* ══════════ COVER PAGE ══════════ */
  .rpt-cover {
    display: flex;
    flex-direction: column;
    padding: 16mm 16mm 14mm;
    overflow: hidden;
    min-height: auto !important;
  }
  .cover-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    padding: 0;
  }
  .cover-brand {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20pt;
  }
  .cover-logo-wrap {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .cover-logo-img { border-radius: 12px; }
  .cover-brand-text {}
  .cover-brand-name {
    font-size: 17pt;
    font-weight: 800;
    color: #111827;
    letter-spacing: -0.02em;
    line-height: 1.15;
  }
  .cover-brand-abbr {
    font-size: 8pt;
    color: var(--text-muted);
    margin-top: 3px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .cover-divider {
    height: 2px;
    background: linear-gradient(90deg, var(--navy) 0%, var(--accent-blue) 60%, transparent 100%);
    margin-bottom: 20pt;
    max-width: 180px;
  }
  .cover-title-section { margin-bottom: 20pt; }
  .cover-report-label {
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--accent-blue);
    margin-bottom: 5pt;
  }
  .cover-report-title {
    font-size: 22pt;
    font-weight: 800;
    color: #111827;
    margin: 0;
    line-height: 1.15;
    letter-spacing: -0.02em;
  }
  .cover-meta-grid {
    display: flex;
    flex-direction: column;
    gap: 0;
    max-width: 340px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .cover-meta-item {
    display: flex;
    align-items: baseline;
    gap: 16px;
    padding: 6pt 10pt;
    border-bottom: 1px solid var(--border);
    background: white;
  }
  .cover-meta-item:last-child { border-bottom: none; }
  .cover-meta-item:nth-child(even) { background: var(--bg-stripe); }
  .cover-meta-label {
    font-size: 7pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-secondary);
    min-width: 110px;
    flex-shrink: 0;
  }
  .cover-meta-value {
    font-size: 9pt;
    color: var(--text-primary);
    font-weight: 500;
  }
  .cover-footer {
    font-size: 7.5pt;
    color: var(--text-muted);
    border-top: 1px solid var(--border);
    padding-top: 8pt;
    line-height: 1.6;
    max-width: 420px;
    margin-top: 24pt;
  }

  /* ══════════ SECTION TITLE ══════════ */
  .section-title {
    font-size: 14pt;
    font-weight: 800;
    color: var(--navy);
    margin: 0 0 6pt;
    letter-spacing: -0.01em;
  }
  .section-note {
    font-size: 8pt;
    color: var(--text-muted);
    margin-bottom: 10pt;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  /* ══════════ TABLES ══════════ */
  .rpt-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
  }
  .rpt-table th {
    background: var(--navy);
    color: white;
    padding: 6pt 8pt;
    text-align: left;
    font-size: 8pt;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .rpt-table th:first-child { border-radius: 4px 0 0 0; }
  .rpt-table th:last-child { border-radius: 0 4px 0 0; }
  .rpt-table td {
    padding: 5pt 8pt;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
    color: var(--text-primary);
    font-size: 8.5pt;
  }
  .rpt-table tbody tr:last-child td { border-bottom: none; }
  .rpt-table tbody tr:nth-child(even) td { background: var(--bg-stripe); }
  .rpt-table tbody tr:hover td { background: var(--navy-pale); }

  .summary-table { border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
  .summary-table td, .summary-table th { border: 1px solid var(--border); }

  /* KF table — explicit borders for print rendering */
  .kf-table { border: 1px solid var(--border-strong); }
  .kf-table th { border-right: 1px solid rgba(255,255,255,0.2); }
  .kf-table td { border: 1px solid var(--border); vertical-align: top; padding: 5pt 8pt; }
  .kf-table tbody tr { break-inside: avoid; page-break-inside: avoid; }

  .cell-center { text-align: center; }
  .cell-muted { color: var(--text-muted); font-size: 8pt; }
  .cell-epa-title { font-weight: 500; }
  .no-data { color: var(--text-muted); font-style: italic; }

  /* ══════════ EPA BANNER ══════════ */
  .epa-banner {
    display: flex;
    align-items: center;
    gap: 10pt;
    background: var(--navy);
    color: white;
    padding: 10pt 12pt;
    border-radius: 4px;
    margin-bottom: 10pt;
  }
  .epa-banner-id {
    font-size: 8pt;
    font-weight: 700;
    opacity: 0.7;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
  }
  .epa-banner-title {
    flex: 1;
    font-size: 11pt;
    font-weight: 700;
    line-height: 1.3;
  }
  .epa-banner-badge { flex-shrink: 0; }

  /* ══════════ STATS ROW ══════════ */
  .stats-row {
    display: flex;
    gap: 8pt;
    margin-bottom: 10pt;
  }
  .stat-box {
    flex: 1;
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 6pt 10pt;
    background: var(--bg-stripe);
  }
  .stat-box-wide { flex: 1.8; }
  .stat-label {
    font-size: 7pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    margin-bottom: 3pt;
  }
  .stat-value {
    font-size: 11pt;
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }
  .stat-value-sm {
    font-size: 8.5pt;
    font-weight: 500;
  }

  /* ══════════ CONTENT BLOCKS ══════════ */
  .content-block { margin-bottom: 10pt; }
  .block-heading {
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--navy);
    border-bottom: 1.5px solid var(--navy);
    padding-bottom: 4pt;
    margin-bottom: 6pt;
  }
  .block-count {
    font-weight: 400;
    color: var(--text-muted);
    font-size: 7.5pt;
    text-transform: none;
    letter-spacing: 0;
  }

  /* ══════════ COMMENTS ══════════ */
  .comments-list { list-style: none; margin: 0; padding: 0; }
  .comment-item {
    font-size: 8.5pt;
    line-height: 1.55;
    padding: 5pt 8pt 5pt 12pt;
    border-bottom: 1px solid var(--border);
    color: var(--text-primary);
    position: relative;
  }
  .comment-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 60%;
    background: var(--navy-pale);
    border-radius: 2px;
  }
  .comment-item:last-child { border-bottom: none; }

  /* ══════════ AI BLOCK ══════════ */
  .ai-block {
    background: #f8faff;
    border: 1px solid #c7d5f0;
    border-radius: 6px;
    padding: 10pt 12pt;
  }
  .ai-block-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8pt;
    border-bottom: 1.5px solid var(--navy);
    padding-bottom: 4pt;
  }
  .ai-block-title {
    border-bottom: none !important;
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
    font-size: 8pt;
  }
  .ai-icon {
    font-size: 10pt;
    color: var(--accent-blue);
    flex-shrink: 0;
  }
  .ai-content {
    font-size: 8.5pt;
    line-height: 1.6;
    color: var(--text-primary);
  }
  .ai-content p { margin: 0 0 6pt; }
  .ai-content ul, .ai-content ol { margin: 0 0 6pt 16pt; padding: 0; }
  .ai-content li { margin-bottom: 3pt; }
  .ai-content strong { font-weight: 700; color: var(--text-primary); }
  .ai-content h1, .ai-content h2, .ai-content h3 {
    font-size: 9pt;
    font-weight: 700;
    margin: 7pt 0 3pt;
    color: var(--navy);
  }

  .empty-state {
    font-size: 8.5pt;
    color: var(--text-muted);
    font-style: italic;
    margin: 0;
    padding: 4pt 0;
  }

  /* ══════════ BADGES ══════════ */
  .dev-badge {
    display: inline-flex;
    align-items: center;
    padding: 2pt 7pt;
    border-radius: 20px;
    font-size: 7.5pt;
    font-weight: 700;
    white-space: nowrap;
    border: 1px solid;
    letter-spacing: 0.01em;
  }
  .badge-remedial {
    background: var(--badge-remedial-bg);
    color: var(--badge-remedial-text);
    border-color: var(--badge-remedial-border);
  }
  .badge-early {
    background: var(--badge-early-bg);
    color: var(--badge-early-text);
    border-color: var(--badge-early-border);
  }
  .badge-developing {
    background: var(--badge-developing-bg);
    color: var(--badge-developing-text);
    border-color: var(--badge-developing-border);
  }
  .badge-entrustable {
    background: var(--badge-entrustable-bg);
    color: var(--badge-entrustable-text);
    border-color: var(--badge-entrustable-border);
  }
  .badge-none {
    font-size: 8pt;
    color: var(--text-muted);
    font-style: italic;
  }

  /* ══════════════════════════════════════════════════════
     PRINT OVERRIDES
  ══════════════════════════════════════════════════════ */
  @media print {
    @page {
      size: A4 portrait;
      margin: 0;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
    }

    .print-root {
      background: white !important;
    }

    .no-print, .screen-toolbar {
      display: none !important;
    }

    /* Global header: hidden on screen, fixed at top of every printed page */
    .global-print-header {
      display: flex;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      justify-content: space-between;
      align-items: center;
      font-size: 8pt;
      color: var(--text-secondary);
      border-bottom: 1.5px solid var(--navy);
      padding: 5pt 16mm;
      background: white;
      box-sizing: border-box;
      z-index: 9999;
    }

    /* Each .rpt-page — extra top padding to clear the fixed header */
    .rpt-page {
      width: 100% !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 20mm 16mm 14mm !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      break-after: auto !important;
      page-break-after: auto !important;
    }

    /* Cover page: original top padding — has its own full design, no header needed */
    .rpt-cover {
      padding-top: 14mm !important;
      min-height: auto !important;
      height: auto !important;
    }

    /* Cover and summary pages each get their own page */
    .rpt-cover,
    .rpt-summary-page {
      break-after: page !important;
      page-break-after: always !important;
    }

    /* EPAs flow continuously — no forced page break */
    .rpt-epa-page {
      break-before: auto !important;
      page-break-before: auto !important;
    }

    /* Force colors in print */
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Prevent orphaned blocks — keep whole blocks together */
    .epa-banner,
    .stats-row,
    .stat-box,
    .content-block,
    .ai-block,
    .comment-item,
    .rpt-table,
    .cover-meta-grid,
    .cover-brand,
    .cover-title-section,
    .cover-footer {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    /* ALL table rows must not split across pages */
    tr, tbody tr, .kf-table tr, .summary-table tr {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    /* EPA banner + stats must always be on same page as content below */
    .epa-banner { break-after: avoid !important; page-break-after: avoid !important; }
    .stats-row { break-after: avoid !important; page-break-after: avoid !important; }

    /* Keep ai-block from being orphaned at top of a new page */
    .ai-block {
      break-before: avoid !important;
      page-break-before: avoid !important;
    }

    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }

    /* Table hover not needed in print */
    .rpt-table tbody tr:hover td {
      background: inherit !important;
    }

    /* Ensure brand name stays black in print */
    .cover-brand-name,
    .cover-report-title {
      color: #111827 !important;
    }
  }
`;