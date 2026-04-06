'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

import LineGraph from '@/components/(StudentComponents)/LineGraph';
import HalfCircleGauge from '@/components/(StudentComponents)/HalfCircleGauge';
import { createClient } from '@/utils/supabase/client';

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
  timeRange: 3 | 6 | 12;
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

function extractRelevantFeedback(
  llmFeedback: unknown,
  epaId: number
): string | null {
  if (!llmFeedback) return null;

  if (typeof llmFeedback === 'object') {
    const feedbackObj = llmFeedback as Record<string, string>;
    const relevantEntries = Object.entries(feedbackObj).filter(([key]) => parseInt(key.split('.')[0]) === epaId);
    const merged = relevantEntries.map(([, val]) => val).filter(Boolean).join('\n\n');
    return merged || null;
  }

  if (typeof llmFeedback === 'string') {
    try {
      const feedbackObj = JSON.parse(llmFeedback) as Record<string, string>;
      if ('_error' in feedbackObj) return `_error:${feedbackObj['_error']}`;
      const relevantEntries = Object.entries(feedbackObj).filter(([key]) => parseInt(key.split('.')[0]) === epaId);
      const merged = relevantEntries.map(([, val]) => val).filter(Boolean).join('\n\n');
      return merged || null;
    } catch {
      return null;
    }
  }

  return null;
}

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

  // Graph x-axis: full time window from cutoff to now (includes new assessments after report).
  const graphWindowStart = cutoff.toISOString();
  const graphWindowEnd   = new Date(Math.max(reportDate.getTime(), today.getTime())).toISOString();

  const fetchTitle = useCallback(async () => {
    const { data } = await supabase.from('epa_kf_descriptions').select('epa_descriptions').single();
    if (data?.epa_descriptions) {
      setEpaTitle(data.epa_descriptions[epaStr] || '');
    }
  }, [epaStr]);

  const fetchData = useCallback(async () => {
    // ── 1. Fetch assessments from form_results (live, filtered by student) ──
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

    // ── 2. Fetch the specific report by its ID ──
    const { data: targetReport } = await supabase
      .from('student_reports')
      .select('created_at, time_window, report_data, kf_avg_data, llm_feedback')
      .eq('id', reportId)
      .single();

    const parsedAssessments: Assessment[] = [];
    const parsedComments: CommentEntry[] = [];

    for (const row of resultData ?? []) {
      const formResponse = row.form_responses;
      if (formResponse?.form_requests?.student_id !== studentId) continue;

      const date = row.created_at;
      const setting = formResponse.form_requests?.clinical_settings || null;
      const responseId = row.response_id ?? '';

      let commentExtractedForThisRow = false;

      for (const [kfKey, level] of Object.entries(row.results)) {
        const [epaKey, kfNum] = kfKey.split('.');
        if (Number.parseInt(epaKey) === epaId) {
          parsedAssessments.push({
            epaId,
            keyFunctionId: `kf${kfNum}`,
            devLevel: level as DevLevel,
            date,
            setting,
          });

          if (!commentExtractedForThisRow) {
            commentExtractedForThisRow = true;
            const commentBlock = formResponse.response?.response?.[epaStr];
            if (commentBlock) {
              Object.values(commentBlock).forEach((kfObj) => {
                if (kfObj && typeof kfObj === 'object' && 'text' in kfObj) {
                  const texts = (kfObj as KeyFunctionResponse).text;
                  if (Array.isArray(texts)) {
                    texts.filter((t) => typeof t === 'string' && t.trim() !== '').forEach((t) => {
                      parsedComments.push({ text: t, responseId });
                    });
                  }
                }
              });
            }
          }
        }
      }
    }

    setAssessments(parsedAssessments);
    // Deduplicate by text+responseId
    const seen = new Set<string>();
    setComments(parsedComments.filter((c) => {
      const key = `${c.responseId}::${c.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }));

    // ── 3. Load stored scores and AI feedback from this specific report ──
    if (targetReport) {
      const kfs: Record<string, number> = {};
      const epaKfScores: number[] = [];

      if (targetReport.kf_avg_data) {
        for (const [kfKey, val] of Object.entries(targetReport.kf_avg_data)) {
          if (kfKey.startsWith(`${epaId}.`)) {
            const kfId = `kf${kfKey.split('.')[1]}`;
            if (typeof val === 'number') {
              kfs[kfId] = val;
              epaKfScores.push(val);
            }
          }
        }
      }

      setKfAverages(kfs);
      setEpaAvgFromKFs(
        epaKfScores.length > 0 ? Math.floor(epaKfScores.reduce((a, b) => a + b, 0) / epaKfScores.length) : null
      );

      setLlmFeedback(extractRelevantFeedback(targetReport.llm_feedback, epaId));
    }

    // ── 4. Build the graph using assessments within this report's time window ──
    // Use the later of reportDate or now so new assessments submitted after
    // the report was generated still appear on the graph.
    const windowStart = new Date(reportCreatedAt);
    windowStart.setMonth(windowStart.getMonth() - timeRange);
    const graphUpperBound = new Date(Math.max(reportDate.getTime(), Date.now()));

    const monthlyMap: Record<string, number[]> = {};
    const lifetimeScores: number[] = [];

    for (const a of parsedAssessments) {
      const val = a.devLevel;
      if (typeof val === 'number') {
        lifetimeScores.push(val);

        const aDate = new Date(a.date);
        if (aDate >= windowStart && aDate <= graphUpperBound) {
          const year = aDate.getFullYear();
          const month = String(aDate.getMonth() + 1).padStart(2, '0');
          const key = `${year}-${month}-01`;
          if (!monthlyMap[key]) monthlyMap[key] = [];
          monthlyMap[key].push(val);
        }
      }
    }

    const graphData = Object.entries(monthlyMap)
      .map(([date, vals]) => ({
        date,
        value: Math.floor(vals.reduce((a, b) => a + b, 0) / vals.length),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
  useEffect(() => {
    if (!expanded) return;
    if (llmFeedback && llmFeedback !== 'Generating...') return;

    const poll = async () => {
      const { data } = await supabase
        .from('student_reports')
        .select('llm_feedback')
        .eq('id', reportId)
        .single();

      if (!data?.llm_feedback) return;
      if (data.llm_feedback === 'Generating...') return;

      const extracted = extractRelevantFeedback(data.llm_feedback, epaId);
      if (extracted) setLlmFeedback(extracted);
    };

    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [expanded, llmFeedback, reportId, epaId]);

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

  return (
    <div className={`card rounded shadow-sm ${expanded ? 'expanded' : ''}`}>
      <div
        className='card-header d-flex justify-content-between align-items-center'
        onClick={() => setExpanded((prev) => !prev)}
        style={{ cursor: 'pointer' }}
      >
        <div>
          <h5 className='mb-0'>
            EPA {epaId}: {epaTitle}
          </h5>
        </div>
        <HalfCircleGauge average={epaAvgFromKFs} allGreen={allGreen} />
      </div>

      <div className='card-body' style={{ display: expanded ? 'block' : 'none' }}>
        <div className='row mb-4'>
          <div className='col-md-6'>
            <h6 className='fw-bold border-bottom pb-1'>Performance Over Time</h6>
            <LineGraph data={lineGraphData} windowStart={graphWindowStart} windowEnd={graphWindowEnd} />
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
                  ? `${['Remedial', 'Early-Developing', 'Developing', 'Entrustable'][Math.floor(lifetimeAverage)]}`
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
                        : `${['Remedial', 'Early-Developing', 'Developing', 'Entrustable'][Math.floor(avg)]}`}
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
          <h6 className='fw-bold border-bottom pb-1'>AI Summary &amp; Recommendations</h6>
          <div className='border rounded p-3 bg-body-secondary scrollable-box markdown-preview'>
            {llmFeedback ? (
              llmFeedback.startsWith('_error:') ? (
                <p className='text-warning mb-0'>
                  <i className='bi bi-exclamation-triangle me-2' />
                  {llmFeedback.slice('_error:'.length)}
                </p>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {llmFeedback}
                </ReactMarkdown>
              )
            ) : (
              <p className='text-muted mb-0'>
                <em>Generating Feedback...</em>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EPABox;
