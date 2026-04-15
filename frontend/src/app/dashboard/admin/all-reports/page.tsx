'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getEPAKFDescs } from '@/utils/get-epa-data';
import { useRequireRole } from '@/utils/useRequiredRole';
import dynamic from 'next/dynamic';
import DownloadPDFButton from '@/components/(StudentComponents)/PrintPDFButton';
import { sendResubmissionEmail } from './admin-email-api/send-email-admin.server';
import {
  formatReportTimeWindowLabel,
  getReportTimeWindowMonths,
  REPORT_TIME_WINDOWS,
  type ReportTimeWindow,
} from '@/utils/epa-scoring';
import {
  analyzeCommentsQuality,
  detectFaultReasons,
  reasonLabel,
  type EPACheckSummary,
  type FaultReason,
  type FormFlagSummary,
} from '@/utils/comment-quality';
import {
  collectCommentsPerEpa,
  extractCommentTextsForEpa,
  groupKfDescriptions,
  type SupabaseRow,
} from '@/utils/report-response';

const EPABox = dynamic(() => import('@/components/(StudentComponents)/EPABox'), { ssr: false });

const supabase = createClient();

interface Student {
  id: string;
  display_name: string;
}

interface StudentReport {
  id: string;
  user_id: string;
  title: string;
  time_window: string;
  report_data: Record<string, number>;
  llm_feedback: string | null;
  created_at: string;
}

interface FormResult {
  response_id: string;
  created_at: string;
  results: Record<string, number>;
}

interface FormRequestWithRater {
  id: string;
  completed_by: string;
  student_id: string;
  profiles?: {
    email: string | null;
    display_name: string | null;
  } | null;
}

const REPORT_EPAS = Array.from({ length: 13 }, (_, i) => i + 1);

function formatTimeWindowLabel(timeWindow: StudentReport['time_window']): string {
  return formatReportTimeWindowLabel(timeWindow);
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

export default function AdminAllReportsPage() {
  useRequireRole(['admin', 'dev']);

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<StudentReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [kfDescriptions, setKfDescriptions] = useState<Record<string, string[]> | null>(null);

  const [title, setTitle] = useState<string>('');
  const [reportTimeWindow, setReportTimeWindow] = useState<ReportTimeWindow>(3);
  const [formResults, setFormResults] = useState<FormResult[]>([]);
  const [editingEPA, setEditingEPA] = useState<number | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState<string[]>([]);
  const [formFlagsByResponse, setFormFlagsByResponse] = useState<Record<string, FormFlagSummary>>({});
  const [reportSearch, setReportSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState<3 | 6 | 12>(3);

  // Comment-quality checks per EPA
  const [epaChecks, setEpaChecks] = useState<Record<number, EPACheckSummary>>({});
  const [runningChecks, setRunningChecks] = useState(false);
  const [lastCheckAt, setLastCheckAt] = useState<string | null>(null);

  // Email sending state
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [formRequestData, setFormRequestData] = useState<FormRequestWithRater | null>(null);

  // Comment deletion / score recalculation state
  const [commentDeleted, setCommentDeleted] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'student');
      const ids = roles?.map((r) => r.user_id) ?? [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', ids)
        .eq('account_status', 'Active');

      setStudents((profiles ?? []).map((p) => ({ id: p.id, display_name: p.display_name ?? 'Unnamed Student' })));
    };

    fetchStudents();
  }, []);

  const fetchReports = useCallback(async (studentId: string) => {
    const { data } = await supabase
      .from('student_reports')
      .select('*')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false });
    if (data) {
      setReports(
        data.map((report) => ({
          ...report,
          title: getDisplayReportTitle(report.title),
          time_window: formatTimeWindowLabel(report.time_window),
        }))
      );
    }
  }, []);

  const fetchFormResults = useCallback(async () => {
    if (!selectedStudent) return;
    const { data: requests } = await supabase.from('form_requests').select('id').eq('student_id', selectedStudent.id);
    const requestIds = requests?.map((r) => r.id) ?? [];
    if (requestIds.length === 0) {
      setFormResults([]);
      return;
    }

    const { data: responses } = await supabase
      .from('form_responses')
      .select('response_id')
      .in('request_id', requestIds);

    const responseIds = responses?.map((r) => r.response_id) ?? [];
    if (responseIds.length === 0) {
      setFormResults([]);
      return;
    }

    const { data } = await supabase.from('form_results').select('*').in('response_id', responseIds);
    if (data) setFormResults(data);
  }, [selectedStudent]);

  const fetchComments = useCallback(async () => {
    if (!selectedStudent || editingEPA === null || !selectedFormId) return;
    const { data: resultData, error } = await supabase
      .from('form_results')
      .select(
        `
        response_id,
        created_at,
        results,
        form_responses:form_responses!form_results_response_id_fkey (
          response,
          form_requests:form_requests!form_responses_request_id_fkey (
            student_id,
            clinical_settings
          )
        )
      `
      )
      .returns<SupabaseRow[]>();

    if (error) {
      console.error(error);
      return;
    }

    const parsedComments: string[] = [];
    for (const row of resultData ?? []) {
      if (row.response_id !== selectedFormId) continue;
      const formResponse = row.form_responses;
      if (formResponse?.form_requests?.student_id !== selectedStudent.id) continue;

      if (formResponse.response?.response) {
        const epaKey = String(editingEPA);
        parsedComments.push(...extractCommentTextsForEpa(formResponse, epaKey));
      }
    }
    setComments(parsedComments);
  }, [selectedStudent, editingEPA, selectedFormId]);

  // Fetch form request data with rater information
  const fetchFormRequestData = useCallback(async () => {
    if (!selectedFormId) return;

    try {
      // Get the form_response to find the request_id
      const { data: formResponse, error: frError } = await supabase
        .from('form_responses')
        .select('request_id')
        .eq('response_id', selectedFormId)
        .single();

      if (frError || !formResponse) {
        console.error('Error fetching form response:', frError);
        setFormRequestData(null);
        return;
      }

      // Get the form_request with completed_by (rater id)
      const { data: formRequest, error: reqError } = await supabase
        .from('form_requests')
        .select('id, completed_by, student_id')
        .eq('id', formResponse.request_id)
        .single();

      if (reqError || !formRequest) {
        console.error('Error fetching form request:', reqError);
        setFormRequestData(null);
        return;
      }

      // Get all users to find the rater's email (email is in auth.users, not profiles)
      const { data: users, error: usersError } = await supabase.rpc('fetch_users');
      if (usersError) {
        console.error('Error fetching users:', usersError);
        setFormRequestData(null);
        return;
      }

      interface User {
        user_id: string;
        display_name?: string;
        email?: string;
      }

      // Find the rater in the users list
      const rater = (users as User[]).find((u) => u.user_id === formRequest.completed_by);

      // Combine the data
      setFormRequestData({
        id: formRequest.id,
        completed_by: formRequest.completed_by,
        student_id: formRequest.student_id,
        profiles: rater ? {
          email: rater.email || null,
          display_name: rater.display_name || null,
        } : null,
      });
    } catch (error) {
      console.error('Error in fetchFormRequestData:', error);
      setFormRequestData(null);
    }
  }, [selectedFormId]);

  // Handler to send resubmission email
  const handleSendResubmissionEmail = async () => {
    if (!formRequestData || !selectedStudent) {
      setEmailStatus({ type: 'error', message: 'Missing required data to send email' });
      return;
    }

    if (!formRequestData.profiles?.email) {
      setEmailStatus({ type: 'error', message: 'Rater email not found' });
      return;
    }

    setSendingEmail(true);
    setEmailStatus(null);

    try {
      // Collect flagged reasons from current comments
      let flaggedReasons: string[] = [];
      if (comments.length > 0) {
        const commentReasons = new Set<string>();
        comments.forEach(c => {
          const reasons = detectFaultReasons(c);
          reasons.forEach(r => commentReasons.add(reasonLabel(r)));
        });
        flaggedReasons = Array.from(commentReasons);
      }

      const { data: formResponse } = await supabase
        .from('form_responses')
        .select('request_id')
        .eq('response_id', selectedFormId || '')
        .single();

      if (!formResponse) {
        setEmailStatus({ type: 'error', message: 'Form request not found' });
        setSendingEmail(false);
        return;
      }

      // Reopen the form request so the rater can access it again
      const { error: reopenError } = await supabase
        .from('form_requests')
        .update({ active_status: true })
        .eq('id', formResponse.request_id);

      if (reopenError) {
        console.error('Error reopening form request:', reopenError);
        setEmailStatus({ type: 'error', message: 'Failed to reopen form request' });
        setSendingEmail(false);
        return;
      }

      await sendResubmissionEmail({
        to: formRequestData.profiles.email,
        raterName: formRequestData.profiles.display_name ?? undefined,
        studentName: selectedStudent.display_name,
        requestId: formResponse.request_id,
        responseId: selectedFormId || undefined,
        flaggedReasons: flaggedReasons.length > 0 ? flaggedReasons : undefined,
      });

      setEmailStatus({ type: 'success', message: 'Resubmission request email sent successfully!' });
    } catch (error) {
      console.error('Error sending email:', error);
      setEmailStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to send email' 
      });
    } finally {
      setSendingEmail(false);
    }
  };

  useEffect(() => {
    if (selectedStudent && selectedReport && editingEPA !== null && selectedFormId) {
      fetchComments();
      fetchFormRequestData();
    }
  }, [selectedStudent, selectedReport, editingEPA, selectedFormId, fetchComments, fetchFormRequestData]);

  const handleResultChange = useCallback((key: string, newVal: number) => {
    setFormResults((prev) =>
      prev.map((r) =>
        r.response_id === selectedFormId
          ? { ...r, results: { ...r.results, [key]: newVal } }
          : r
      )
    );
  }, [selectedFormId]);

  const handleGenerate = async () => {
    if (!selectedStudent) return;
    await supabase.rpc('generate_report', {
      student_id_input: selectedStudent.id,
      time_range_input: reportTimeWindow,
      report_title: title.trim() || 'Admin Generated',
    });
    setTitle('');
    fetchReports(selectedStudent.id);
  };

  useEffect(() => {
    getEPAKFDescs().then((descs) => {
      if (descs?.kf_desc) {
        setKfDescriptions(groupKfDescriptions(descs.kf_desc));
      }
    });
  }, []);

  const handleSave = async () => {
    if (!selectedFormId) return;
    const target = formResults.find((r) => r.response_id === selectedFormId);
    if (!target) return;
    setSaving(true);
    await supabase.from('form_results').update({ results: target.results }).eq('response_id', selectedFormId);
    setSaving(false);
    setSelectedFormId(null);
  };

  const recalculateReport = useCallback(async () => {
    if (!selectedStudent || !selectedReport) return;
    setRecalculating(true);
    try {
      // 1. Fetch all response_ids for this student
      const { data: requests } = await supabase.from('form_requests').select('id').eq('student_id', selectedStudent.id);
      const requestIds = (requests ?? []).map((r) => r.id);
      if (requestIds.length === 0) return;

      const { data: responses } = await supabase.from('form_responses').select('response_id').in('request_id', requestIds);
      const responseIds = (responses ?? []).map((r) => r.response_id);
      if (responseIds.length === 0) return;

      // 2. Fetch form_results within the report's time window
      const reportDate = new Date(selectedReport.created_at);
      const cutoff = new Date(selectedReport.created_at);
      cutoff.setMonth(cutoff.getMonth() - getReportTimeWindowMonths(selectedReport.time_window));

      const { data: results } = await supabase
        .from('form_results')
        .select('created_at, results')
        .in('response_id', responseIds);

      const windowResults = (results ?? []).filter((r) => {
        const d = new Date(r.created_at);
        return d >= cutoff && d <= reportDate;
      });

      // 3. Average per KF across all results in window
      const kfSums: Record<string, number[]> = {};
      for (const result of windowResults) {
        for (const [kfKey, val] of Object.entries(result.results as Record<string, number>)) {
          if (typeof val === 'number') {
            if (!kfSums[kfKey]) kfSums[kfKey] = [];
            kfSums[kfKey].push(val);
          }
        }
      }
      const kfAvgData: Record<string, number> = {};
      for (const [kfKey, vals] of Object.entries(kfSums)) {
        kfAvgData[kfKey] = vals.reduce((a, b) => a + b, 0) / vals.length;
      }

      // 4. Update the report — setting llm_feedback to 'Generating...' triggers
      //    the Python listener to regenerate the Gemini summary.
      await supabase
        .from('student_reports')
        .update({ kf_avg_data: kfAvgData, llm_feedback: 'Generating...' })
        .eq('id', selectedReport.id);

      setCommentDeleted(false);
    } finally {
      setRecalculating(false);
    }
  }, [selectedStudent, selectedReport]);

  const formsForEPA = useMemo(() => {
    if (!editingEPA) return [];
    return formResults.filter((f) => Object.keys(f.results).some((k) => k.startsWith(`${editingEPA}.`)));
  }, [formResults, editingEPA]);

  const fetchFormFlagsForEPA = useCallback(async () => {
    if (!selectedStudent || editingEPA === null) {
      setFormFlagsByResponse({});
      return;
    }

    const responseIds = formsForEPA.map((f) => f.response_id);
    if (responseIds.length === 0) {
      setFormFlagsByResponse({});
      return;
    }

    const { data: resultData, error } = await supabase
      .from('form_results')
      .select(
        `
        response_id,
        created_at,
        results,
        form_responses:form_responses!form_results_response_id_fkey (
          response,
          form_requests:form_requests!form_responses_request_id_fkey (
            student_id,
            clinical_settings
          )
        )
      `
      )
      .in('response_id', responseIds)
      .returns<SupabaseRow[]>();

    if (error) {
      console.error(error);
      return;
    }

    const commentsByResponse: Record<string, string[]> = {};
    responseIds.forEach((id) => {
      commentsByResponse[id] = [];
    });

    for (const row of resultData ?? []) {
      const formResponse = row.form_responses;
      if (formResponse?.form_requests?.student_id !== selectedStudent.id) continue;

      if (formResponse.response?.response) {
        const epaKey = String(editingEPA);
        commentsByResponse[row.response_id].push(...extractCommentTextsForEpa(formResponse, epaKey));
      }
    }

    const next: Record<string, FormFlagSummary> = {};
    responseIds.forEach((responseId) => {
      const list = commentsByResponse[responseId] ?? [];
      const { flagged, total, reasonCounts } = analyzeCommentsQuality(list);
      const entries = Object.entries(reasonCounts) as [FaultReason, number][];
      const top = entries.sort((a, b) => b[1] - a[1]).find(([, count]) => count > 0);

      next[responseId] = {
        totalComments: total,
        flaggedComments: flagged.length,
        topReason: top ? top[0] : null,
      };
    });

    setFormFlagsByResponse(next);
  }, [selectedStudent, editingEPA, formsForEPA]);

  useEffect(() => {
    if (editingEPA === null) {
      setFormFlagsByResponse({});
      return;
    }
    fetchFormFlagsForEPA();
  }, [editingEPA, fetchFormFlagsForEPA]);

  const formsForEPASorted = useMemo(() => {
    return [...formsForEPA].sort((a, b) => {
      const aFlagged = (formFlagsByResponse[a.response_id]?.flaggedComments ?? 0) > 0;
      const bFlagged = (formFlagsByResponse[b.response_id]?.flaggedComments ?? 0) > 0;

      if (aFlagged !== bFlagged) return aFlagged ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [formsForEPA, formFlagsByResponse]);

  const handleReportSelect = (r: StudentReport) => {
    setLoadingReport(true);
    setSelectedReport(null);

    // reset checks when switching report
    setEpaChecks({});
    setLastCheckAt(null);
    setCommentDeleted(false);

    setTimeout(() => {
      setSelectedReport(r);
      setLoadingReport(false);
    }, 500);
  };

  /** Run checks scoped to the currently selected report's time window */
  const runCommentQualityChecks = useCallback(async () => {
    if (!selectedStudent || !selectedReport) return;

    setRunningChecks(true);

    try {
      // 1) fetch all response_ids for this student
      const { data: requests } = await supabase.from('form_requests').select('id').eq('student_id', selectedStudent.id);
      const requestIds = requests?.map((r) => r.id) ?? [];

      if (requestIds.length === 0) {
        setEpaChecks({});
        setLastCheckAt(new Date().toLocaleString());
        return;
      }

      const { data: responses } = await supabase
        .from('form_responses')
        .select('response_id')
        .in('request_id', requestIds);

      const responseIds = responses?.map((r) => r.response_id) ?? [];

      if (responseIds.length === 0) {
        setEpaChecks({});
        setLastCheckAt(new Date().toLocaleString());
        return;
      }

      // 2) fetch form_results + joined form_responses.response JSON
      const { data: resultData, error } = await supabase
        .from('form_results')
        .select(
          `
          response_id,
          created_at,
          results,
          form_responses:form_responses!form_results_response_id_fkey (
            response,
            form_requests:form_requests!form_responses_request_id_fkey (
              student_id,
              clinical_settings
            )
          )
        `
        )
        .in('response_id', responseIds)
        .returns<SupabaseRow[]>();

      if (error) {
        console.error(error);
        return;
      }

      // Scope to only assessments on or before this report's creation date
      const reportCreatedAt = new Date(selectedReport.created_at);

      // 3) Collect comments per EPA (scoped to report date)
      const perEPAComments = collectCommentsPerEpa(resultData, selectedStudent.id, reportCreatedAt, REPORT_EPAS);

      // 4) Analyze each EPA
      const summaries: Record<number, EPACheckSummary> = {};
      for (const epaId of REPORT_EPAS) {
        const list = perEPAComments[epaId] ?? [];
        const { flagged, total, reasonCounts } = analyzeCommentsQuality(list);

        summaries[epaId] = {
          totalComments: total,
          flaggedComments: flagged.length,
          reasonCounts,
          examples: flagged.slice(0, 3),
        };
      }

      setEpaChecks(summaries);
      setLastCheckAt(new Date().toLocaleString());
    } finally {
      setRunningChecks(false);
    }
  }, [selectedStudent, selectedReport]);

  const filteredReports = useMemo(() => {
    const search = reportSearch.trim().toLowerCase();
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - timeFilter);
    return reports.filter((r) =>
      (!search || getDisplayReportTitle(r.title).toLowerCase().includes(search)) &&
      new Date(r.created_at) >= cutoff
    );
  }, [reportSearch, timeFilter, reports]);

  const hasAnyFlags = useMemo(() => Object.values(epaChecks).some((s) => s.flaggedComments > 0), [epaChecks]);

  // NEW: compute the most common reason per EPA (to display “flag means …”)
  const topReasonForEPA = useCallback((epaId: number): FaultReason | null => {
    const s = epaChecks[epaId];
    if (!s) return null;
    const entries = Object.entries(s.reasonCounts) as [FaultReason, number][];
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    const top = sorted.find(([, count]) => count > 0);
    return top ? top[0] : null;
  }, [epaChecks]);

  return (
    <div className='container py-5'>
      <style>{`
        /* Transitions */
        .fade-transition { opacity: 0; transition: opacity 0.3s ease-in-out; }
        .fade-transition.show { opacity: 1; }

        /* Flag / badge styling — uses currentColor so it works in both light and dark mode */
        .epa-flagged {
          border: 1px solid rgba(220, 53, 69, 0.45) !important;
          box-shadow: 0 0.25rem 0.75rem rgba(220, 53, 69, 0.08);
          border-radius: 0.75rem;
        }
        .epa-flag-badge {
          font-size: 0.75rem;
          padding: 0.2rem 0.5rem;
          border-radius: 999px;
          border: 1px solid rgba(220, 53, 69, 0.5);
          background: rgba(220, 53, 69, 0.12);
          color: rgb(220, 53, 69);
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }
        .epa-ok-badge {
          font-size: 0.75rem;
          padding: 0.2rem 0.5rem;
          border-radius: 999px;
          border: 1px solid rgba(25, 135, 84, 0.5);
          background: rgba(25, 135, 84, 0.12);
          color: rgb(25, 135, 84);
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }
        .mini-muted { color: var(--bs-secondary-color, #6c757d); font-size: 0.85rem; }
        .example-box {
          border: 1px solid var(--bs-border-color, rgba(0,0,0,0.08));
          border-radius: 0.75rem;
          padding: 0.75rem;
          background: var(--bs-body-bg, #fff);
          /* Fixed height so all cards are uniform regardless of flag count */
          height: 220px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .example-box-header {
          flex-shrink: 0;
        }
        .example-box-body {
          flex: 1 1 0;
          overflow-y: auto;
          min-height: 0;
          margin-top: 0.5rem;
          padding-right: 2px; /* breathing room for scrollbar */
        }
        /* Subtle scrollbar styling */
        .example-box-body::-webkit-scrollbar { width: 4px; }
        .example-box-body::-webkit-scrollbar-track { background: transparent; }
        .example-box-body::-webkit-scrollbar-thumb {
          background: var(--bs-border-color, rgba(0,0,0,0.2));
          border-radius: 4px;
        }
        .reason-chip {
          display: inline-block;
          margin-right: 0.35rem;
          margin-top: 0.25rem;
          font-size: 0.72rem;
          padding: 0.12rem 0.45rem;
          border-radius: 999px;
          border: 1px solid var(--bs-border-color, rgba(0,0,0,0.15));
          background: var(--bs-tertiary-bg, rgba(0,0,0,0.04));
          color: var(--bs-body-color);
          white-space: nowrap;
        }
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
        .report-pill {
          display: inline-flex;
          align-items: center;
          padding: 0.15rem 0.55rem;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 600;
          background: var(--bs-secondary-bg, rgba(255,255,255,0.06));
          border: 1px solid var(--bs-border-color, rgba(255,255,255,0.1));
        }
        .form-option-flagged {
          border-color: rgba(220, 53, 69, 0.55) !important;
          box-shadow: inset 0 0 0 1px rgba(220, 53, 69, 0.15);
        }
      `}</style>

      <div className='card shadow-sm p-4 mt-5 mb-3 d-print-none'>
        <h2 className='mb-4 d-print-none'>Student Report Generation</h2>

        {/* Student Picker */}
        <div className='d-print-none'>
          <div className='mb-3 d-print-none'>
            <label className='form-label d-print-none'>Select Student</label>
            <select
              className='form-select'
              value={selectedStudent?.id || ''}
              onChange={(e) => {
                const student = students.find((s) => s.id === e.target.value);
                setSelectedStudent(student ?? null);
                setReports([]);
                setSelectedReport(null);
                setFormResults([]);
                setEditingEPA(null);
                setSelectedFormId(null);
                setComments([]);
                setEpaChecks({});
                setLastCheckAt(null);
                if (student) fetchReports(student.id);
              }}
            >
              <option value=''>-- Select Student --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name}
                </option>
              ))}
            </select>
          </div>

          <div className='d-flex gap-3 align-items-end mb-4 d-print-none'>
            <div className='flex-grow-1 d-print-none'>
              <label className='form-label'>Report Title</label>
              <input type='text' className='form-control' value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className='d-print-none'>
              <label className='form-label'>Time Window</label>
              <div className='btn-group d-flex' role='group' aria-label='Report time window'>
                {REPORT_TIME_WINDOWS.map((value) => (
                  <button
                    key={value}
                    type='button'
                    className={`btn btn-outline-primary${reportTimeWindow === value ? ' active' : ''}`}
                    onClick={() => setReportTimeWindow(value)}
                  >
                    Last {value} mo
                  </button>
                ))}
              </div>
            </div>

            <button className='btn btn-success' onClick={handleGenerate} disabled={!selectedStudent}>
              Generate Report
            </button>
          </div>
        </div>

        <hr className='d-print-none mb-4 mt-3 d-print-none' />

        {/* Run checks button */}
        <div className='d-print-none'>
          <div className='d-flex align-items-center justify-content-between gap-3'>
            <div>
              <div className='fw-semibold'>Comment Quality Checks</div>
              <div className='mini-muted'>
                Checks comments in the selected report. Flags show why comments might be low quality (example: “Comment too short”, “Generic/unhelpful”, etc.).
                {lastCheckAt ? ` Last run: ${lastCheckAt}` : ' Select a report first.'}
              </div>
            </div>

            <div className='d-flex align-items-center gap-2'>
              {Object.keys(epaChecks).length > 0 && (
                <span className={hasAnyFlags ? 'epa-flag-badge' : 'epa-ok-badge'}>
                  {hasAnyFlags ? '⚑ Issues found' : '✓ No issues found'}
                </span>
              )}
              <button
                className='btn btn-outline-secondary'
                onClick={runCommentQualityChecks}
                disabled={!selectedStudent || !selectedReport || runningChecks}
                title='Run quality checks for comments in the selected report'
              >
                {runningChecks ? 'Running...' : 'Run Checks'}
              </button>
            </div>
          </div>

          {/* Summary cards per EPA — only shows EPAs with flagged comments */}
          {Object.keys(epaChecks).length > 0 && (
            <div className='mt-3'>
              {!hasAnyFlags && (
                <div className='epa-ok-badge' style={{ display: 'inline-flex', marginBottom: '0.5rem' }}>
                  ✓ All EPAs checked — no issues found
                </div>
              )}
              <div className='row g-2'>
                {REPORT_EPAS.map((epaId) => {
                  const s = epaChecks[epaId];
                  if (!s) return null;
                  const flagged = s.flaggedComments > 0;
                  // Only show cards that have actual flagged comments
                  if (!flagged) return null;
                  const topReason = topReasonForEPA(epaId);

                  return (
                               <div key={`check-sum-${epaId}`} className='col-12 col-md-4'>
                      <div className={`example-box ${flagged ? 'epa-flagged' : ''}`}>
                        {/* Fixed header — never scrolls */}
                        <div className='example-box-header'>
                          <div className='d-flex align-items-center justify-content-between flex-wrap gap-1'>
                            <div className='fw-semibold'>EPA {epaId}</div>
                            <span className={flagged ? 'epa-flag-badge' : 'epa-ok-badge'}>
                              {flagged ? `⚑ ${s.flaggedComments}/${s.totalComments} flagged` : `✓ ${s.totalComments} checked`}
                            </span>
                          </div>
                          {flagged && topReason && (
                            <div className='mini-muted mt-1' style={{ fontSize: '0.78rem' }}>
                              Top issue: <span className='fw-semibold'>{reasonLabel(topReason)}</span>
                            </div>
                          )}
                        </div>

                        {/* Scrollable body */}
                        <div className='example-box-body'>
                          {flagged && s.examples.length > 0 ? (
                            <>
                              <div className='mini-muted mb-1' style={{ fontSize: '0.78rem' }}>Examples</div>
                              {s.examples.map((ex, idx) => (
                                <div key={idx} className='mb-2' style={{ borderTop: idx > 0 ? '1px solid var(--bs-border-color, rgba(0,0,0,0.06))' : 'none', paddingTop: idx > 0 ? '0.4rem' : 0 }}>
                                  <div style={{ fontSize: '0.82rem', lineHeight: 1.4 }} title={ex.text}>
                                    {ex.text.length > 80 ? ex.text.slice(0, 80) + '…' : ex.text}
                                  </div>
                                  <div className='mt-1'>
                                    {ex.reasons.map((r) => (
                                      <span key={r} className='reason-chip'>
                                        {reasonLabel(r)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </>
                          ) : (
                            <div className='mini-muted' style={{ fontSize: '0.82rem' }}>
                              {flagged ? 'No examples available.' : 'No issues detected.'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <hr className='d-print-none mb-5 mt-4 d-print-none' />

        {selectedStudent && reports.length > 0 && (
          <div className='mb-4 d-print-none'>
            <h5 className='mb-3'>Past Reports for {selectedStudent.display_name}</h5>
            <div className='d-flex flex-wrap align-items-center gap-2 mb-3'>
              <input
                type='text'
                className='form-control'
                placeholder='Search reports by name'
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                style={{ maxWidth: 280 }}
              />
              <div className='btn-group' role='group' aria-label='Time range filter'>
                {([3, 6, 12] as const).map((value) => (
                  <button
                    key={value}
                    type='button'
                    className={`btn btn-outline-secondary${timeFilter === value ? ' active' : ''}`}
                    onClick={() => setTimeFilter(value)}
                  >
                    Last {value} mo
                  </button>
                ))}
              </div>
            </div>
            <div className='list-group report-list-shell report-list-scroll'>
              {filteredReports.map((r) => (
                <button
                  type='button'
                  key={r.id}
                  className={`list-group-item list-group-item-action report-row ${selectedReport?.id === r.id ? 'active' : ''}`}
                  onClick={() => handleReportSelect(r)}
                >
                  {r.title} – {new Date(r.created_at).toLocaleDateString()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loadingReport && (
        <div className='text-center my-5 d-print-none'>
          <div className='spinner-border text-primary d-print-none' role='status'>
            <span className='visually-hidden d-print-none'>Loading...</span>
          </div>
        </div>
      )}

      {selectedStudent && selectedReport && !loadingReport && (
        <div className='pb-3 p-4 mb-5'>
          <div className='d-flex justify-content-between align-items-center mb-3 d-print-none'>
            <h3 className='m-0'>{selectedReport.title}</h3>
            <DownloadPDFButton studentId={selectedStudent?.id} reportId={selectedReport?.id} returnUrl="/dashboard/admin/all-reports" />
          </div>

          <hr className='d-print-none' />

          {/* ── Print-only cover block (hidden on screen) ── */}
          <div style={{ display: 'none' }} className='print-cover'>
            <style>{`
              @media print {
                .print-cover {
                  display: block !important;
                  border-bottom: 2pt solid #333;
                  padding-bottom: 10pt;
                  margin-bottom: 14pt;
                }
                .print-cover h1 {
                  font-size: 14pt;
                  font-weight: bold;
                  margin: 0 0 4pt 0;
                }
                .print-cover .print-meta {
                  font-size: 9pt;
                  color: #444;
                  display: flex;
                  gap: 24pt;
                }
              }
            `}</style>
            <h1>{selectedReport.title}</h1>
            <div className='print-meta'>
              <span><strong>Student:</strong> {selectedStudent.display_name}</span>
              <span><strong>Time Window:</strong> {selectedReport.time_window}</span>
              <span><strong>Generated:</strong> {new Date(selectedReport.created_at).toLocaleDateString()}</span>
              <span><strong>Printed:</strong> {new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {REPORT_EPAS.map((epaId) => {
            const check = epaChecks[epaId];
            const flagged = !!check && check.flaggedComments > 0;
            const topReason = topReasonForEPA(epaId);

            return (
              <div
                key={`container-${epaId}`}
                className='epa-report-section'
              >
                {/* Admin controls — hidden on print */}
                <div className='d-flex justify-content-between align-items-center mb-2 d-print-none'>
                  <div className='d-flex align-items-center gap-2'>
                    <button
                      className='btn btn-sm btn-outline-primary'
                      onClick={async () => {
                        setEditingEPA(epaId);
                        await fetchFormResults();
                      }}
                    >
                      Edit EPA {epaId}
                    </button>

                    {check && (
                      <span className={flagged ? 'epa-flag-badge' : 'epa-ok-badge'}>
                        {flagged ? `⚑ ${check.flaggedComments}/${check.totalComments} flagged` : `✓ ${check.totalComments} checked`}
                      </span>
                    )}

                    {flagged && topReason && (
                      <span className='mini-muted'>
                        Flag means: <span className='fw-semibold'>{reasonLabel(topReason)}</span>
                      </span>
                    )}
                  </div>
                </div>

                <EPABox
                  key={`epabox-${epaId}-${selectedStudent.id}-${selectedReport?.id}`}
                  epaId={epaId}
                  timeRange={getReportTimeWindowMonths(selectedReport.time_window)}
                  kfDescriptions={kfDescriptions}
                  studentId={selectedStudent.id}
                  reportId={selectedReport.id}
                  reportCreatedAt={selectedReport.created_at}
                  isAdmin
                  onCommentDeleted={() => setCommentDeleted(true)}
                />
              </div>
            );
          })}

          {/* Recalculate banner — appears after a comment is deleted */}
          {commentDeleted && (
            <div className='alert alert-warning d-flex align-items-center justify-content-between gap-3 mt-3 d-print-none'>
              <div>
                <strong>Comment deleted.</strong> BERT is rescoring in the background. Click Recalculate when ready to update scores and regenerate AI feedback.
              </div>
              <button
                className='btn btn-warning btn-sm flex-shrink-0'
                onClick={recalculateReport}
                disabled={recalculating}
              >
                {recalculating ? 'Recalculating...' : 'Recalculate Scores & Feedback'}
              </button>
            </div>
          )}

          {/* Modal */}
          {editingEPA && (
            <div
              className='modal fade show d-block fade-transition show'
              tabIndex={-1}
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            >
              <div className='modal-dialog modal-lg'>
                <div className='modal-content'>
                  <div className='modal-header'>
                    <h5 className='modal-title'>Select a Form Result for EPA {editingEPA}</h5>
                    <button
                      className='btn-close'
                      onClick={() => {
                        setEditingEPA(null);
                        setSelectedFormId(null);
                      }}
                    ></button>
                  </div>

                  <div className='modal-body'>
                    {formsForEPASorted.map((form) => {
                      const summary = formFlagsByResponse[form.response_id];
                      const flagged = (summary?.flaggedComments ?? 0) > 0;

                      return (
                        <button
                          key={form.response_id}
                          className={`btn w-100 mb-2 text-start ${
                            selectedFormId === form.response_id ? 'active' : ''
                          } ${flagged ? 'btn-outline-danger form-option-flagged' : 'btn-outline-secondary'}`}
                          onClick={() => setSelectedFormId(form.response_id)}
                        >
                          <div className='d-flex w-100 justify-content-between align-items-center gap-2'>
                            <span>{new Date(form.created_at).toLocaleString()}</span>
                            {summary ? (
                              flagged ? (
                                <span className='epa-flag-badge'>⚑ {summary.flaggedComments} flagged</span>
                              ) : (
                                <span className='mini-muted'>No flags</span>
                              )
                            ) : (
                              <span className='mini-muted'>Checking...</span>
                            )}
                          </div>
                          {flagged && summary?.topReason ? (
                            <div className='mini-muted mt-1'>Flag means: {reasonLabel(summary.topReason)}</div>
                          ) : null}
                        </button>
                      );
                    })}

                    {selectedFormId && (
                      <div className='mt-4'>
                        <h6>Edit Development Levels</h6>
                        <div className='row'>
                          {Object.entries(formResults.find((r) => r.response_id === selectedFormId)?.results || {})
                            .filter(([k]) => k.startsWith(`${editingEPA}.`))
                            .map(([key, val]) => {
                              const [epaStr, kfStr] = key.split('.');
                              const label = kfDescriptions?.[epaStr]?.[parseInt(kfStr) - 1] ?? key;
                              return (
                                <div key={key} className='col-md-4 mb-3'>
                                  <label className='form-label'>
                                    KF {key}
                                    <br />
                                    <small className='text-muted'>{label}</small>
                                  </label>
                                  <select
                                    className='form-select'
                                    value={Math.floor(Number(val))}
                                    onChange={(e) => handleResultChange(key, parseInt(e.target.value))}
                                  >
                                    {[0, 1, 2, 3].map((n) => (
                                      <option key={n} value={n}>
                                        {n} – {['Remedial', 'Early-Developing', 'Developing', 'Entrustable'][n]}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              );
                            })}
                        </div>

                        {/* Comments Section */}
                        <div className='mt-4'>
                          <h6>Comments</h6>
                          <div className='border rounded p-2 scrollable-box'>
                            <ul className='list-group'>
                              {comments.length > 0 ? (
                                comments.map((c, i) => {
                                  const reasons = detectFaultReasons(c);
                                  const flagged = reasons.length > 0;
                                  return (
                                    <li
                                      key={i}
                                      className={`list-group-item d-flex flex-column gap-1 ${
                                        flagged ? 'border border-danger-subtle' : ''
                                      }`}
                                    >
                                      <div>{c}</div>
                                      {flagged && (
                                        <div>
                                          {reasons.map((r) => (
                                            <span key={r} className='reason-chip'>
                                              {reasonLabel(r)}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </li>
                                  );
                                })
                              ) : (
                                <li className='list-group-item'>No comments found</li>
                              )}
                            </ul>
                          </div>

                          <div className='mini-muted mt-2'>
                            If a comment is flagged, the label explains why (example: “Comment too short”, “Generic /
                            unhelpful”). Flags are a review signal for admins.
                          </div>

                          {/* Email notification and send button */}
                          {comments.some(c => detectFaultReasons(c).length > 0) && (
                            <div className='mt-3 p-3 border border-warning rounded bg-warning bg-opacity-10'>
                              <div className='fw-semibold mb-2'>Action Required: Flagged Content Detected</div>
                              <div className='mini-muted mb-2'>
                                This form contains low-quality comments. You can request the rater to resubmit the form with improved feedback.
                              </div>
                              {emailStatus && (
                                <div className={`alert alert-${emailStatus.type === 'success' ? 'success' : 'danger'} py-2 px-3 mb-2`} role='alert'>
                                  {emailStatus.message}
                                </div>
                              )}
                              {!formRequestData && !sendingEmail && (
                                <div className='alert alert-info py-2 px-3 mb-2' role='alert'>
                                  Loading rater information...
                                </div>
                              )}
                              <button 
                                className='btn btn-warning btn-sm'
                                onClick={() => handleSendResubmissionEmail()}
                                disabled={sendingEmail || !formRequestData}
                              >
                                {sendingEmail ? (
                                  <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Sending...
                                  </>
                                ) : (
                                  <>Request Resubmission from Rater</>
                                )}
                              </button>
                              {formRequestData?.profiles && (
                                <div className='mini-muted mt-2'>
                                  Email will be sent to: {formRequestData.profiles.display_name} ({formRequestData.profiles.email})
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className='modal-footer'>
                    <button
                      className='btn btn-secondary'
                      onClick={() => {
                        setEditingEPA(null);
                        setSelectedFormId(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button className='btn btn-primary' onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

