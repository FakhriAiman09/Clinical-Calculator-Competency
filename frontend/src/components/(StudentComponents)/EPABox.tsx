'use client';

import React, { useEffect, useState, useCallback, useLayoutEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css'; // you can change this theme if desired

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

interface EPABoxProps {
  epaId: number;
  timeRange: 3 | 6 | 12;
  kfDescriptions?: Record<string, string[]> | null;
  studentId: string;
}

const supabase = createClient();

const EPABox: React.FC<EPABoxProps> = ({ epaId, timeRange, kfDescriptions, studentId }) => {
  const [expanded, setExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('print').matches;
    }
    return false;
  });

  const wasAutoExpandedRef = useRef(false);

  useLayoutEffect(() => {
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
  const [comments, setComments] = useState<string[]>([]);
  const [llmFeedback, setLlmFeedback] = useState<string | null>(null);
  const [lifetimeAverage, setLifetimeAverage] = useState<number | null>(null);
  const [lineGraphData, setLineGraphData] = useState<{ date: string; value: number }[]>([]);
  const [kfAverages, setKfAverages] = useState<Record<string, number>>({});
  const [epaAvgFromKFs, setEpaAvgFromKFs] = useState<number | null>(null);

  const epaStr = String(epaId);
  const now = new Date();
  const cutoff = new Date();
  cutoff.setMonth(now.getMonth() - timeRange);

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

    const { data: reportData } = await supabase
      .from('student_reports')
      .select('created_at, time_window, report_data, kf_avg_data, llm_feedback')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false });

    const parsedAssessments: Assessment[] = [];
    const parsedComments: string[] = [];

    for (const row of resultData ?? []) {
      const formResponse = row.form_responses;
      if (formResponse?.form_requests?.student_id !== studentId) continue;

      const date = row.created_at;
      const setting = formResponse.form_requests?.clinical_settings || null;

      for (const [kfKey, level] of Object.entries(row.results)) {
        const [epaKey, kfNum] = kfKey.split('.');
        if (parseInt(epaKey) === epaId) {
          parsedAssessments.push({
            epaId,
            keyFunctionId: `kf${kfNum}`,
            devLevel: level as DevLevel,
            date,
            setting,
          });
        }
      }

      const commentBlock = formResponse.response?.response?.[epaStr];
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

    setAssessments(parsedAssessments);
    setComments(parsedComments);

    const targetWindow = `${timeRange}m`;
    const targetReport = (reportData ?? []).find((r) => r.time_window === targetWindow);

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

      // ✅ Extract and render EPA-specific Markdown feedback
      if (targetReport.llm_feedback && typeof targetReport.llm_feedback === 'object') {
        const relevantEntries = Object.entries(targetReport.llm_feedback).filter(([key]) => {
          const epaKey = key.split('.')[0];
          return parseInt(epaKey) === epaId;
        });

        const merged = relevantEntries
          .map(([, val]) => val)
          .filter(Boolean)
          .join('\n\n');
        setLlmFeedback(merged || null);
      } else {
        setLlmFeedback(null);
      }
    }

    const monthlyMap: Record<string, number[]> = {};
    const lifetimeScores: number[] = [];

    for (const r of reportData ?? []) {
      const val = r.report_data?.[epaStr];
      if (typeof val === 'number') {
        const date = new Date(r.created_at);
        const key = new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1).toISOString().slice(0, 10);
        if (!monthlyMap[key]) monthlyMap[key] = [];
        monthlyMap[key].push(val);
        lifetimeScores.push(val);
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
  }, [epaId, studentId, timeRange, epaStr]);

  useEffect(() => {
    fetchTitle();
  }, [fetchTitle]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = assessments.filter((a) => new Date(a.date) >= cutoff);
  const settings = Array.from(new Set(filtered.map((a) => a.setting).filter(Boolean)));
  const lastDate = filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date;
  const daysSinceLast = lastDate
    ? Math.floor((now.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
    : 'N/A';

  const formAssessmentDates = new Set(filtered.map((a) => a.date));
  const assessmentCount = formAssessmentDates.size;

  const allGreen = Object.values(kfAverages).length >= 3 && Object.values(kfAverages).every((v) => Math.floor(v) === 3);

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

      {expanded && (
        <div className='card-body'>
          <div className='row mb-4'>
            <div className='col-md-6'>
              <h6 className='fw-bold border-bottom pb-1'>Performance Over Time</h6>
              <LineGraph data={lineGraphData} />
            </div>
            <div className='col-md-6'>
              <h6 className='fw-bold border-bottom pb-1'>EPA Stats</h6>
              <ul className='list-group mb-3'>
                <li className='list-group-item'>Assessments: {assessmentCount}</li>
                <li className='list-group-item'>Days Since Last: {daysSinceLast}</li>
                <li className='list-group-item'>Settings: {settings.join(', ')}</li>
                <li className='list-group-item'>
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
              <thead className='table-light'>
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
              <ul className='list-group'>
                {comments.length > 0 ? (
                  comments.map((c, i) => (
                    <li key={i} className='list-group-item'>
                      {c}
                    </li>
                  ))
                ) : (
                  <li className='list-group-item'>No comments found</li>
                )}
              </ul>
            </div>
          </div>

          <div className='mb-4'>
            <h6 className='fw-bold border-bottom pb-1'>AI Summary & Recommendations</h6>
            <div className='border rounded p-3 bg-body-secondary scrollable-box markdown-preview'>
              {llmFeedback ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {llmFeedback}
                </ReactMarkdown>
              ) : (
                <p className='text-muted mb-0'>
                  <em>Generating Feedback...</em>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EPABox;