'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

import LineGraph from '@/components/(StudentComponents)/LineGraph';
import HalfCircleGauge from '@/components/(StudentComponents)/HalfCircleGauge';
import { createClient } from '@/utils/supabase/client';
import { DEV_LEVEL_LABELS, getEpaLevelFromScores } from '@/utils/epa-scoring';
import { getRawFeedback, getRelevantFeedbackMarkdown } from '@/utils/report-feedback';

export type DevLevel = 0 | 1 | 2 | 3 | null;

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

interface Assessment {
  epaId: number;
  keyFunctionId: string;
  devLevel: DevLevel;
  date: string;
  setting?: string | null;
}

interface CommentEntry {
  text: string;
  responseId: string;
}

interface EPABoxProps {
  epaId: number;
  timeRange: number;
  kfDescriptions?: Record<string, string[]> | null;
  studentId: string;
  /** The ID of the specific report being displayed. */
  reportId: string;
  /** ISO timestamp of when the report was generated — used as the end of the time window. */
  reportCreatedAt: string;
  /** When true, shows a delete button next to each comment. */
  isAdmin?: boolean;
  /** Called after a comment is successfully deleted so the parent can trigger recalculation. */
  onCommentDeleted?: () => void;
}

const supabase = createClient();

// ── fetchData helpers ───────────���───────────────��──────────────────────────

function extractCommentsFromFormRow(
  formResponse: FormResponsesInner,
  epaStr: string,
  responseId: string,
): CommentEntry[] {
  const commentBlock = formResponse.response?.response?.[epaStr];
  if (!commentBlock) return [];
  const entries: CommentEntry[] = [];
  for (const kfObj of Object.values(commentBlock)) {
    if (!kfObj || typeof kfObj !== 'object' || !('text' in kfObj)) continue;
    const texts = (kfObj as KeyFunctionResponse).text;
    if (!Array.isArray(texts)) continue;
    for (const t of texts) {
      if (typeof t === 'string' && t.trim() !== '') entries.push({ text: t, responseId });
    }
  }
  return entries;
}

function parseRowsIntoAssessmentsAndComments(
  resultData: SupabaseRow[] | null,
  studentId: string,
  epaId: number,
  epaStr: string,
  reportCreatedAt: string,
): { parsedAssessments: Assessment[]; parsedComments: CommentEntry[] } {
  const parsedAssessments: Assessment[] = [];
  const parsedComments: CommentEntry[] = [];

  for (const row of resultData ?? []) {
    const formResponse = row.form_responses;
    if (formResponse?.form_requests?.student_id !== studentId) continue;
    if (new Date(row.created_at) > new Date(reportCreatedAt)) continue;

    const date = row.created_at;
    const setting = formResponse.form_requests?.clinical_settings || null;
    const responseId = row.response_id ?? '';
    let commentExtractedForThisRow = false;

    for (const [kfKey, level] of Object.entries(row.results)) {
      const [epaKey, kfNum] = kfKey.split('.');
      if (Number.parseInt(epaKey) !== epaId) continue;

      parsedAssessments.push({ epaId, keyFunctionId: `kf${kfNum}`, devLevel: level as DevLevel, date, setting });

      if (!commentExtractedForThisRow) {
        commentExtractedForThisRow = true;
        parsedComments.push(...extractCommentsFromFormRow(formResponse, epaStr, responseId));
      }
    }
  }
  return { parsedAssessments, parsedComments };
}

function deduplicateComments(comments: CommentEntry[]): CommentEntry[] {
  const seen = new Set<string>();
  return comments.filter((c) => {
    const key = `${c.responseId}::${c.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractKfAveragesFromReport(
  kfAvgData: Record<string, unknown> | null | undefined,
  epaId: number,
): { kfs: Record<string, number>; epaKfScores: number[] } {
  const kfs: Record<string, number> = {};
  const epaKfScores: number[] = [];
  if (!kfAvgData) return { kfs, epaKfScores };
  for (const [kfKey, val] of Object.entries(kfAvgData)) {
    if (kfKey.startsWith(`${epaId}.`) && typeof val === 'number') {
      kfs[`kf${kfKey.split('.')[1]}`] = val;
      epaKfScores.push(val);
    }
  }
  return { kfs, epaKfScores };
}

function buildGraphData(
  parsedAssessments: Assessment[],
  windowStart: Date,
  graphUpperBound: Date,
): { graphData: { date: string; value: number }[]; lifetimeScores: number[] } {
  const monthlyMap: Record<string, number[]> = {};
  const lifetimeScores: number[] = [];
  for (const a of parsedAssessments) {
    const val = a.devLevel;
    if (typeof val !== 'number') continue;
    lifetimeScores.push(val);
    const aDate = new Date(a.date);
    if (aDate >= windowStart && aDate <= graphUpperBound) {
      const key = `${aDate.getFullYear()}-${String(aDate.getMonth() + 1).padStart(2, '0')}-01`;
      if (!monthlyMap[key]) monthlyMap[key] = [];
      monthlyMap[key].push(val);
    }
  }
  const graphData = Object.entries(monthlyMap)
    .map(([date, vals]) => ({ date, value: Math.floor(vals.reduce((a, b) => a + b, 0) / vals.length) }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return { graphData, lifetimeScores };
}

// ── EPABox ──────────────────────────────────────────────────────────────────

const EPABox: React.FC<EPABoxProps> = ({
  epaId,
  timeRange,
  kfDescriptions,
  studentId,
  reportId,
  reportCreatedAt,
  isAdmin = false,
  onCommentDeleted,
}) => {
  const [expanded, setExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('print').matches;
    }
    return false;
  });

  const wasAutoExpandedRef = useRef(false);

  useEffect(() => {
    const handleBeforePrint = () => {
      if (!expanded) {
        setExpanded(true);
        wasAutoExpandedRef.current = true;
      }
    };

    const handleAfterPrint = () => {
      if (wasAutoExpandedRef.current) {
        setExpanded(false);
        wasAutoExpandedRef.current = false;
      }
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [expanded]);

  const [epaTitle, setEpaTitle] = useState('');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [comments, setComments] = useState<CommentEntry[]>([]);
  const [llmFeedback, setLlmFeedback] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [stopping, setStopping] = useState(false);
  // Holds the raw llm_feedback string from DB before regeneration, so Stop can restore it.
  const rawLlmFeedbackRef = useRef<string | null>(null);
  // When true, the polling effect must not overwrite llmFeedback (Stop was clicked).
  const stoppedRef = useRef(false);
  const [lifetimeAverage, setLifetimeAverage] = useState<number | null>(null);
  const [lineGraphData, setLineGraphData] = useState<{ date: string; value: number }[]>([]);
  const [kfAverages, setKfAverages] = useState<Record<string, number>>({});
  const [epaAvgFromKFs, setEpaAvgFromKFs] = useState<number | null>(null);

  const epaStr = String(epaId);

  // Use the report's creation time as the reference point so that opening an
  // old report shows the data as it was at generation time, not relative to today.
  const reportDate = new Date(reportCreatedAt);
  const cutoff = new Date(reportCreatedAt);
  cutoff.setMonth(cutoff.getMonth() - timeRange);

  // daysSinceLast is always relative to today so it remains meaningful.
  const today = new Date();

  const fetchTitle = useCallback(async () => {
    const { data } = await supabase.from('epa_kf_descriptions').select('epa_descriptions').single();
    if (data?.epa_descriptions) {
      setEpaTitle(data.epa_descriptions[epaStr] || '');
    }
  }, [epaStr]);

  const fetchData = useCallback(async () => {
    const { data: resultData } = await supabase
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

    const { data: targetReport } = await supabase
      .from('student_reports')
      .select('created_at, time_window, report_data, kf_avg_data, llm_feedback')
      .eq('id', reportId)
      .single();

    const { parsedAssessments, parsedComments } = parseRowsIntoAssessmentsAndComments(
      resultData, studentId, epaId, epaStr, reportCreatedAt,
    );
    setAssessments(parsedAssessments);
    setComments(deduplicateComments(parsedComments));

    if (targetReport) {
      const { kfs, epaKfScores } = extractKfAveragesFromReport(targetReport.kf_avg_data, epaId);
      setKfAverages(kfs);
      setEpaAvgFromKFs(getEpaLevelFromScores(epaKfScores));
      // Only save a completed feedback value — never 'Generating...' or null.
      const rawFeedback = getRawFeedback(targetReport.llm_feedback);
      if (rawFeedback) rawLlmFeedbackRef.current = rawFeedback;
      setLlmFeedback(getRelevantFeedbackMarkdown(targetReport.llm_feedback, epaId, { includeErrors: true }));
    }

    // Use the later of reportDate or now so new assessments after report generation appear.
    const windowStart = new Date(reportCreatedAt);
    windowStart.setMonth(windowStart.getMonth() - timeRange);
    const graphUpperBound = new Date(Math.max(reportDate.getTime(), Date.now()));
    const { graphData, lifetimeScores } = buildGraphData(parsedAssessments, windowStart, graphUpperBound);
    setLineGraphData(graphData);
    if (lifetimeScores.length > 0) {
      setLifetimeAverage(Math.floor(lifetimeScores.reduce((a, b) => a + b, 0) / lifetimeScores.length));
    }
  }, [epaId, studentId, timeRange, epaStr, reportId, reportCreatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchTitle();
  }, [fetchTitle]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll for llm_feedback every 5s until it arrives — scoped to this specific report.
  const pollForLlmFeedback = useCallback(async () => {
    if (stoppedRef.current) return;

    const { data } = await supabase
      .from('student_reports')
      .select('llm_feedback')
      .eq('id', reportId)
      .single();

    if (stoppedRef.current) return;
    if (!data?.llm_feedback) return;
    if (data.llm_feedback === 'Generating...') return;

    const extracted = getRelevantFeedbackMarkdown(data.llm_feedback, epaId, { includeErrors: true });
    if (extracted) {
      const raw = getRawFeedback(data.llm_feedback) ?? JSON.stringify(data.llm_feedback);
      if (raw && raw !== 'Generating...') rawLlmFeedbackRef.current = raw;
      setLlmFeedback(extracted);
    }
  }, [reportId, epaId]);

  useEffect(() => {
    if (!expanded) return;
    if (llmFeedback && llmFeedback !== 'Generating...') return;

    const interval = setInterval(pollForLlmFeedback, 5000);
    return () => clearInterval(interval);
  }, [expanded, llmFeedback, pollForLlmFeedback]);

  // Trigger Gemini to regenerate AI feedback using the frozen kf_avg_data stored
  // at report creation time — today's new assessments are NOT included.
  const handleRegenerate = async () => {
    stoppedRef.current = false;
    setRegenerating(true);
    setLlmFeedback(null);
    const { error } = await supabase
      .from('student_reports')
      .update({ llm_feedback: 'Generating...' })
      .eq('id', reportId);
    if (error) {
      setLlmFeedback('_error:Failed to trigger regeneration. Please try again.');
    }
    setRegenerating(false);
  };

  const handleStop = async () => {
    // Set stoppedRef immediately so any in-flight poll callback is ignored.
    stoppedRef.current = true;
    setStopping(true);

    const cancelled = JSON.stringify({ _error: 'Generation was stopped. Click Regenerate to try again.' });
    const prevRaw = rawLlmFeedbackRef.current;

    // Decide what to write back to DB: previous real feedback if available, else cancelled marker.
    const restoreValue = (prevRaw && prevRaw !== 'Generating...') ? prevRaw : cancelled;
    await supabase.from('student_reports').update({ llm_feedback: restoreValue }).eq('id', reportId);

    // Always show something — never leave UI in the spinner after Stop.
    if (prevRaw && prevRaw !== 'Generating...') {
      const extracted = getRelevantFeedbackMarkdown(prevRaw, epaId, { includeErrors: true });
      setLlmFeedback(extracted ?? '_error:Generation was stopped. Click Regenerate to try again.');
    } else {
      setLlmFeedback('_error:Generation was stopped. Click Regenerate to try again.');
    }

    setStopping(false);
  };

  const filtered = assessments.filter((a) => {
    const aDate = new Date(a.date);
    return aDate >= cutoff && aDate <= reportDate;
  });
  const settings = Array.from(new Set(filtered.map((a) => a.setting).filter(Boolean)));
  const lastDate = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date;
  const daysSinceLast = lastDate
    ? Math.floor((today.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
    : 'N/A';

  const formAssessmentDates = new Set(filtered.map((a) => a.date));
  const assessmentCount = formAssessmentDates.size;

  const allGreen = Object.values(kfAverages).length >= 3 && Object.values(kfAverages).every((v) => Math.floor(v) === 3);

  const deleteComment = async (entry: CommentEntry) => {
    const { data } = await supabase
      .from('form_responses')
      .select('response')
      .eq('response_id', entry.responseId)
      .single();

    if (!data?.response) return;

    // Remove the comment text from every text[] array under this EPA
    const responseObj = data.response as Record<string, unknown>;
    const epaSection = (responseObj?.response as Record<string, unknown>)?.[epaStr] as
      | Record<string, { text?: string[] }>
      | undefined;

    if (epaSection) {
      for (const kf of Object.values(epaSection)) {
        if (Array.isArray(kf.text)) {
          kf.text = kf.text.filter((t) => t !== entry.text);
        }
      }
    }

    await supabase
      .from('form_responses')
      .update({ response: responseObj })
      .eq('response_id', entry.responseId);

    setComments((prev) => prev.filter((c) => !(c.responseId === entry.responseId && c.text === entry.text)));
    onCommentDeleted?.();
  };

  const toggleExpanded = () => setExpanded((prev) => !prev);

  return (
    <div className={`card rounded shadow-sm ${expanded ? 'expanded' : ''}`}>
      <button
        type='button'
        className='card-header d-flex justify-content-between align-items-center'
        onClick={toggleExpanded}
        aria-expanded={expanded}
        style={{ cursor: 'pointer', textAlign: 'left', border: 0, width: '100%' }}
      >
        <div>
          <h5 className='mb-0'>
            EPA {epaId}: {epaTitle}
          </h5>
        </div>
        <HalfCircleGauge average={epaAvgFromKFs} allGreen={allGreen} />
      </button>

      <div className='card-body' style={{ display: expanded ? 'block' : 'none' }}>
        <div className='row mb-4'>
          <div className='col-md-6'>
            <h6 className='fw-bold border-bottom pb-1'>Performance Over Time</h6>
            <LineGraph data={lineGraphData} />
          </div>
          <div className='col-md-6'>
            <h6 className='fw-bold border-bottom pb-1'>EPA Stats</h6>
            <ul className='list-group list-group-flush mb-3'>
              <li className='list-group-item bg-transparent'>Assessments: {assessmentCount}</li>
              <li className='list-group-item bg-transparent'>Days Since Last: {daysSinceLast}</li>
              <li className='list-group-item bg-transparent'>Settings: {settings.join(', ')}</li>
              <li className='list-group-item bg-transparent'>
                Lifetime Average:{' '}
                {lifetimeAverage !== null
                  ? `${DEV_LEVEL_LABELS[Math.floor(lifetimeAverage)]}`
                  : '—'}
              </li>
            </ul>
          </div>
        </div>

        <div className='mb-4'>
          <h6 className='fw-bold border-bottom pb-1'>Key Functions</h6>
          <table className='table table-sm table-bordered'>
            <thead className='table-active'>
              <tr>
                <th>Key Function</th>
                <th>Avg Level</th>
              </tr>
            </thead>
            <tbody>
              {(kfDescriptions?.[epaStr] || []).map((label, index) => {
                const kfId = `kf${index + 1}`;
                const avg = kfAverages[kfId];
                return (
                  <tr key={kfId}>
                    <td className='text-wrap' style={{ maxWidth: '300px' }}>
                      {label}
                    </td>
                    <td>
                      {avg === undefined
                        ? '—'
                        : `${DEV_LEVEL_LABELS[Math.floor(avg)]}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className='mb-4'>
          <h6 className='fw-bold border-bottom pb-1'>Comments</h6>
          <div className='border rounded p-2 scrollable-box'>
            <ul className='list-group list-group-flush'>
              {comments.length > 0 ? (
                comments.map((c, i) => (
                  <li key={i} className='list-group-item bg-transparent d-flex justify-content-between align-items-start gap-2'>
                    <span>{c.text}</span>
                    {isAdmin && (
                      <button
                        className='btn btn-sm btn-outline-danger flex-shrink-0'
                        title='Delete comment'
                        onClick={() => deleteComment(c)}
                      >
                        <i className='bi bi-trash' />
                      </button>
                    )}
                  </li>
                ))
              ) : (
                <li className='list-group-item bg-transparent'>No comments found</li>
              )}
            </ul>
          </div>
        </div>

        <div className='mb-4'>
          <div className='d-flex align-items-center justify-content-between border-bottom pb-1 mb-2'>
            <h6 className='fw-bold mb-0'>AI Summary &amp; Recommendations</h6>
            {llmFeedback === null ? (
              <button
                className='btn btn-sm btn-outline-danger d-flex align-items-center gap-1 d-print-none'
                onClick={handleStop}
                disabled={stopping}
                title='Stop generation and restore previous feedback'
              >
                {stopping ? (
                  <span className='spinner-border spinner-border-sm' role='status' aria-hidden='true' />
                ) : (
                  <i className='bi bi-stop-circle' aria-hidden='true' />
                )}
                {stopping ? 'Stopping…' : 'Stop'}
              </button>
            ) : (
              <button
                className='btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 d-print-none'
                onClick={handleRegenerate}
                disabled={regenerating}
                title='Retry AI summary using the scores saved at report creation time'
              >
                {regenerating ? (
                  <span className='spinner-border spinner-border-sm' role='status' aria-hidden='true' />
                ) : (
                  <i className='bi bi-arrow-clockwise' aria-hidden='true' />
                )}
                {regenerating ? 'Requesting…' : 'Retry'}
              </button>
            )}
          </div>
          <div className='border rounded p-3 bg-body-secondary scrollable-box markdown-preview'>
            {llmFeedback ? (
              llmFeedback.startsWith('_error:') ? (
                <div>
                  <p className='text-warning mb-2'>
                    <i className='bi bi-exclamation-triangle me-2' />
                    {llmFeedback.slice('_error:'.length)}
                  </p>
                </div>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {llmFeedback}
                </ReactMarkdown>
              )
            ) : (
              <p className='text-muted mb-0'>
                <span className='spinner-border spinner-border-sm me-2' role='status' aria-hidden='true' />
                <em>Generating Feedback…</em>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EPABox;
