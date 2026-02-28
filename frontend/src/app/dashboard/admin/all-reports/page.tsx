'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getEPAKFDescs } from '@/utils/get-epa-data';
import { useRequireRole } from '@/utils/useRequiredRole';
import dynamic from 'next/dynamic';
import DownloadPDFButton from '@/components/(StudentComponents)/DownloadPDFButton';

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
  time_window: '3m' | '6m' | '12m';
  report_data: Record<string, number>;
  llm_feedback: string | null;
  created_at: string;
}

interface FormResult {
  response_id: string;
  created_at: string;
  results: Record<string, number>;
}

interface KeyFunctionResponse {
  text?: string[];
  [key: string]: boolean | string[] | undefined;
}

interface EPAResponse {
  [kfId: string]: KeyFunctionResponse;
}

interface FullResponseStructure {
  response?: {
    [epaId: string]: EPAResponse;
  };
}

interface FormResponsesInner {
  response?: FullResponseStructure;
  form_requests: {
    student_id: string;
    clinical_settings?: string;
  };
}

interface SupabaseRow {
  response_id: string;
  created_at: string;
  results: Record<string, number>;
  form_responses: FormResponsesInner;
}

type FaultReason =
  | 'TOO_SHORT'
  | 'GENERIC'
  | 'NO_CONTENT'
  | 'ALL_CAPS'
  | 'REPEATED'
  | 'PROFANITY'
  | 'LOW_SIGNAL';

type FlaggedComment = {
  text: string;
  reasons: FaultReason[];
};

type EPACheckSummary = {
  totalComments: number;
  flaggedComments: number;
  reasonCounts: Record<FaultReason, number>;
  examples: FlaggedComment[]; // small sample for admin preview
};

const REPORT_EPAS = Array.from({ length: 13 }, (_, i) => i + 1);

/** -------------------- Comment-quality heuristics (local, no LLM) -------------------- */
function normalize(s: string) {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'");
}

function isMostlyPunctOrEmpty(s: string) {
  const t = s.trim();
  if (!t) return true;
  const letters = t.replace(/[^a-zA-Z]/g, '').length;
  return letters === 0; // e.g. "..." "??" "—"
}

function isRepeatedCharSpam(s: string) {
  // e.g. "goooood", "!!!!!", "aaaaaa"
  return /(.)\1{5,}/.test(s);
}

function isRepeatedWordSpam(s: string) {
  // e.g. "good good good good"
  return /\b(\w+)\b(?:\s+\1\b){3,}/i.test(s);
}

function detectFaultReasons(textRaw: string): FaultReason[] {
  const text = normalize(textRaw);
  const lower = text.toLowerCase();

  const reasons: FaultReason[] = [];

  if (isMostlyPunctOrEmpty(text)) reasons.push('NO_CONTENT');

  // Too short (low signal)
  const words = text.split(' ').filter(Boolean);
  const wordCount = words.length;
  if (wordCount > 0 && wordCount <= 3) reasons.push('TOO_SHORT');

  // All caps (shouting) - only if enough letters
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length >= 10 && letters === letters.toUpperCase()) reasons.push('ALL_CAPS');

  // Generic / unhelpful (English only)
  const genericExact = new Set([
    'good',
    'nice',
    'ok',
    'okay',
    'great',
    'excellent',
    'well done',
    'n/a',
    'na',
    'none',
    'no comment',
    'nothing',
    'all good',
    'looks good',
    'fine',
  ]);
  if (genericExact.has(lower)) reasons.push('GENERIC');

  // Very generic templates
  const genericContains = [
    'good job',
    'keep it up',
    'keep up the good work',
    'great work',
    'nice work',
    'doing well',
    'no issues',
    'nothing to add',
  ];
  if (genericContains.some((p) => lower.includes(p))) reasons.push('GENERIC');

  // Profanity (simple heuristic list; extend as needed)
  const profanity = ['fuck', 'shit', 'bitch', 'asshole', 'bastard', 'dick', 'cunt'];
  if (profanity.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(lower))) reasons.push('PROFANITY');

  // Repetition spam
  if (isRepeatedCharSpam(text) || isRepeatedWordSpam(text)) reasons.push('REPEATED');

  // Low-signal: praise without any detail indicators
  const praiseWords = ['good', 'great', 'nice', 'excellent', 'well done', 'amazing'];
  const hasPraise = praiseWords.some((w) => lower.includes(w));
  const hasDetailSignal =
    /\b(because|so that|however|but|improve|suggest|recommend|next time|specific|example|when)\b/i.test(lower) ||
    wordCount >= 12; // longer comments more likely to have content
  if (hasPraise && !hasDetailSignal) reasons.push('LOW_SIGNAL');

  return Array.from(new Set(reasons));
}

function analyzeCommentsQuality(
  comments: string[]
): { flagged: FlaggedComment[]; total: number; reasonCounts: Record<FaultReason, number> } {
  const flagged: FlaggedComment[] = [];

  const baseCounts: Record<FaultReason, number> = {
    NO_CONTENT: 0,
    TOO_SHORT: 0,
    GENERIC: 0,
    ALL_CAPS: 0,
    REPEATED: 0,
    PROFANITY: 0,
    LOW_SIGNAL: 0,
  };

  // detect repeated identical comments across the list
  const seen: { text: string; count: number }[] = [];
  const cleanKey = (x: string) => normalize(x).toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const isSame = (a: string, b: string) => cleanKey(a) === cleanKey(b);

  for (const c of comments) {
    const idx = seen.findIndex((x) => isSame(x.text, c));
    if (idx >= 0) seen[idx].count += 1;
    else seen.push({ text: c, count: 1 });
  }

  const repeatedSet = new Set(seen.filter((x) => x.count >= 3).map((x) => cleanKey(x.text)));

  for (const raw of comments) {
    const text = normalize(raw);
    const reasons = detectFaultReasons(text);

    const key = cleanKey(text);
    if (repeatedSet.has(key)) reasons.push('REPEATED');

    const unique = Array.from(new Set(reasons));
    if (unique.length > 0) {
      flagged.push({ text, reasons: unique });
      unique.forEach((r) => {
        baseCounts[r] += 1;
      });
    }
  }

  return { flagged, total: comments.length, reasonCounts: baseCounts };
}

/** Labels that show exactly what the flag means (your request) */
function reasonLabel(r: FaultReason) {
  switch (r) {
    case 'NO_CONTENT':
      return 'No content / empty';
    case 'TOO_SHORT':
      return 'Comment too short';
    case 'GENERIC':
      return 'Generic / unhelpful';
    case 'ALL_CAPS':
      return 'All caps';
    case 'REPEATED':
      return 'Repeated comment';
    case 'PROFANITY':
      return 'Contains profanity';
    case 'LOW_SIGNAL':
      return 'Low signal (not specific)';
    default:
      return r;
  }
}

export default function AdminAllReportsPage() {
  useRequireRole(['admin', 'dev']);

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<StudentReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [kfDescriptions, setKfDescriptions] = useState<Record<string, string[]> | null>(null);
  const [timeRange, setTimeRange] = useState<3 | 6 | 12>(3);
  const [title, setTitle] = useState<string>('');
  const [formResults, setFormResults] = useState<FormResult[]>([]);
  const [editingEPA, setEditingEPA] = useState<number | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState<string[]>([]);

  // Comment-quality checks per EPA
  const [epaChecks, setEpaChecks] = useState<Record<number, EPACheckSummary>>({});
  const [runningChecks, setRunningChecks] = useState(false);
  const [lastCheckAt, setLastCheckAt] = useState<string | null>(null);

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
    if (data) setReports(data);
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
        const commentBlock = formResponse.response.response[epaKey];
        if (commentBlock) {
          Object.values(commentBlock).forEach((kfObj) => {
            if (kfObj && typeof kfObj === 'object' && 'text' in kfObj) {
              const texts = (kfObj as KeyFunctionResponse).text;
              if (Array.isArray(texts)) {
                parsedComments.push(...texts.filter((t) => typeof t === 'string' && t.trim() !== ''));
              }
            }
          });
        }
      }
    }
    setComments(parsedComments);
  }, [selectedStudent, editingEPA, selectedFormId]);

  useEffect(() => {
    if (selectedStudent && selectedReport && editingEPA !== null && selectedFormId) {
      fetchComments();
    }
  }, [selectedStudent, selectedReport, editingEPA, selectedFormId, fetchComments]);

  const handleGenerate = async () => {
    if (!selectedStudent) return;
    await supabase.rpc('generate_report', {
      student_id_input: selectedStudent.id,
      time_range_input: timeRange,
      report_title: title || `Admin Generated (${timeRange}m)`,
    });
    fetchReports(selectedStudent.id);
  };

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

  const handleSave = async () => {
    if (!selectedFormId) return;
    const target = formResults.find((r) => r.response_id === selectedFormId);
    if (!target) return;
    setSaving(true);
    await supabase.from('form_results').update({ results: target.results }).eq('response_id', selectedFormId);
    setSaving(false);
    setSelectedFormId(null);
  };

  const formsForEPA = useMemo(() => {
    if (!editingEPA) return [];
    return formResults.filter((f) => Object.keys(f.results).some((k) => k.startsWith(`${editingEPA}.`)));
  }, [formResults, editingEPA]);

  const handleReportSelect = (r: StudentReport) => {
    setLoadingReport(true);
    setSelectedReport(null);

    // reset checks when switching report
    setEpaChecks({});
    setLastCheckAt(null);

    setTimeout(() => {
      setSelectedReport(r);
      setLoadingReport(false);
    }, 500);
  };

  /** Run checks across all EPAs (for selected student) */
  const runCommentQualityChecks = useCallback(async () => {
    if (!selectedStudent) return;

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

      // 3) Collect comments per EPA
      const perEPAComments: Record<number, string[]> = {};
      REPORT_EPAS.forEach((epa) => (perEPAComments[epa] = []));

      for (const row of resultData ?? []) {
        const fr = row.form_responses;
        if (fr?.form_requests?.student_id !== selectedStudent.id) continue;

        const responseRoot = fr.response?.response;
        if (!responseRoot) continue;

        for (const epaId of REPORT_EPAS) {
          const epaKey = String(epaId);
          const commentBlock = responseRoot[epaKey];
          if (!commentBlock) continue;

          Object.values(commentBlock).forEach((kfObj) => {
            if (kfObj && typeof kfObj === 'object' && 'text' in kfObj) {
              const texts = (kfObj as KeyFunctionResponse).text;
              if (Array.isArray(texts)) {
                perEPAComments[epaId].push(...texts.filter((t) => typeof t === 'string' && t.trim() !== ''));
              }
            }
          });
        }
      }

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
  }, [selectedStudent]);

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
    <div className='container py-5 bg-white'>
      <style>{`
        @media print {
          body { background: white !important; }
          header, .d-print-none, .modal, .btn, .form-control, .form-select, .form-label {
            display: none !important;
          }
          .container { width: 100% !important; max-width: 100% !important; padding: 0 !important; }
          .epa-report-section { border: none !important; box-shadow: none !important; padding: 1rem 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-visible { display: block !important; color: black !important; page-break-before: always; }
        }
        .fade-transition { opacity: 0; transition: opacity 0.3s ease-in-out; }
        .fade-transition.show { opacity: 1; }
        .scrollable-box { max-height: 300px; overflow-y: auto; }

        /* Flag styling */
        .epa-flagged {
          border: 1px solid rgba(220, 53, 69, 0.45);
          box-shadow: 0 0.25rem 0.75rem rgba(220, 53, 69, 0.08);
          border-radius: 0.75rem;
        }
        .epa-flag-badge {
          font-size: 0.75rem;
          padding: 0.2rem 0.5rem;
          border-radius: 999px;
          border: 1px solid rgba(220, 53, 69, 0.35);
          background: rgba(220, 53, 69, 0.08);
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
          border: 1px solid rgba(25, 135, 84, 0.35);
          background: rgba(25, 135, 84, 0.08);
          color: rgb(25, 135, 84);
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }
        .mini-muted { color: #6c757d; font-size: 0.85rem; }
        .example-box {
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 0.75rem;
          padding: 0.75rem;
          background: #fff;
        }
        .reason-chip {
          display: inline-block;
          margin-right: 0.35rem;
          margin-top: 0.25rem;
          font-size: 0.72rem;
          padding: 0.12rem 0.45rem;
          border-radius: 999px;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(0,0,0,0.03);
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
            <div>
              <label className='form-label'>Time Range</label>
              <select
                className='form-select'
                value={timeRange}
                onChange={(e) => setTimeRange(parseInt(e.target.value) as 3 | 6 | 12)}
              >
                {[3, 6, 12].map((m) => (
                  <option key={m} value={m}>
                    {m} months
                  </option>
                ))}
              </select>
            </div>

            <div className='flex-grow-1 d-print-none'>
              <label className='form-label'>Report Title</label>
              <input type='text' className='form-control' value={title} onChange={(e) => setTitle(e.target.value)} />
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
                Flags show why comments might be low quality (example: “Comment too short”, “Generic/unhelpful”, etc.).
                {lastCheckAt ? ` Last run: ${lastCheckAt}` : ''}
              </div>
            </div>

            <div className='d-flex align-items-center gap-2'>
              {Object.keys(epaChecks).length > 0 && (
                <span className={hasAnyFlags ? 'epa-flag-badge' : 'epa-ok-badge'}>
                  {hasAnyFlags ? '⚑ Issues found' : '✓ No issues found'}
                </span>
              )}
              <button
                className='btn btn-outline-dark'
                onClick={runCommentQualityChecks}
                disabled={!selectedStudent || runningChecks}
                title='Run quality checks across all EPAs for this student'
              >
                {runningChecks ? 'Running...' : 'Run Checks'}
              </button>
            </div>
          </div>

          {/* Summary cards per EPA */}
          {Object.keys(epaChecks).length > 0 && (
            <div className='mt-3'>
              <div className='row g-2'>
                {REPORT_EPAS.map((epaId) => {
                  const s = epaChecks[epaId];
                  if (!s) return null;
                  const flagged = s.flaggedComments > 0;
                  const topReason = topReasonForEPA(epaId);

                  return (
                    <div key={`check-sum-${epaId}`} className='col-12 col-md-4'>
                      <div className={`example-box ${flagged ? 'epa-flagged' : ''}`}>
                        <div className='d-flex align-items-center justify-content-between'>
                          <div className='fw-semibold'>EPA {epaId}</div>
                          <span className={flagged ? 'epa-flag-badge' : 'epa-ok-badge'}>
                            {flagged ? `⚑ ${s.flaggedComments}/${s.totalComments} flagged` : `✓ ${s.totalComments} checked`}
                          </span>
                        </div>

                        {/* “What does the flag mean?” */}
                        {flagged && topReason && (
                          <div className='mini-muted mt-2'>
                            Flag means: <span className='fw-semibold'>{reasonLabel(topReason)}</span>
                          </div>
                        )}

                        {flagged && s.examples.length > 0 && (
                          <div className='mt-2'>
                            <div className='mini-muted mb-1'>Examples</div>
                            {s.examples.map((ex, idx) => (
                              <div key={idx} className='mb-2'>
                                <div style={{ fontSize: '0.9rem' }}>{ex.text}</div>
                                <div>
                                  {ex.reasons.map((r) => (
                                    <span key={r} className='reason-chip'>
                                      {reasonLabel(r)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {!flagged && <div className='mini-muted mt-2'>No issues detected.</div>}
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
            <h5>Past Reports for {selectedStudent.display_name}</h5>
            <ul className='list-group'>
              {reports.map((r) => (
                <li
                  key={r.id}
                  className={`list-group-item list-group-item-action ${selectedReport?.id === r.id ? 'active' : ''}`}
                  onClick={() => handleReportSelect(r)}
                  style={{ cursor: 'pointer' }}
                >
                  {r.title} ({r.time_window}) – {new Date(r.created_at).toLocaleDateString()}
                </li>
              ))}
            </ul>
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
            <h3 className='m-0 d-print-none'>{selectedReport.title}</h3>
            <DownloadPDFButton />
          </div>

          <hr className='d-print-none' />

          {REPORT_EPAS.map((epaId) => {
            const check = epaChecks[epaId];
            const flagged = !!check && check.flaggedComments > 0;
            const topReason = topReasonForEPA(epaId);

            return (
              <div
                key={`container-${epaId}`}
                className={`mb-1 p-3 epa-report-section ${flagged ? 'epa-flagged' : ''}`}
              >
                <div className='d-flex justify-content-between align-items-center mb-2'>
                  <div className='d-flex align-items-center gap-2'>
                    <button
                      className='btn btn-sm btn-outline-primary d-print-none'
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
                      <span className='mini-muted d-print-none'>
                        Flag means: <span className='fw-semibold'>{reasonLabel(topReason)}</span>
                      </span>
                    )}
                  </div>
                </div>

                <EPABox
                  key={`epabox-${epaId}-${selectedStudent.id}-${selectedReport?.id}`}
                  epaId={epaId}
                  timeRange={parseInt(selectedReport.time_window) as 3 | 6 | 12}
                  kfDescriptions={kfDescriptions}
                  studentId={selectedStudent.id}
                />
              </div>
            );
          })}

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
                    {formsForEPA.map((form) => (
                      <button
                        key={form.response_id}
                        className={`btn btn-outline-secondary w-100 mb-2 ${
                          selectedFormId === form.response_id ? 'active' : ''
                        }`}
                        onClick={() => setSelectedFormId(form.response_id)}
                      >
                        {new Date(form.created_at).toLocaleString()}
                      </button>
                    ))}

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
                                    onChange={(e) => {
                                      const newVal = parseInt(e.target.value);
                                      setFormResults((prev) =>
                                        prev.map((r) =>
                                          r.response_id === selectedFormId
                                            ? { ...r, results: { ...r.results, [key]: newVal } }
                                            : r
                                        )
                                      );
                                    }}
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