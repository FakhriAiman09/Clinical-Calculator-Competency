'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import HalfCircleGauge from './DemoHalfCircleGauge';
import LineGraph from './DemoLineGraph';
import {
  KF_DESCRIPTIONS,
  EPA_TITLES,
  DEV_LEVEL_LABELS,
  DEV_LEVEL_COLORS,
  computeEPAAverage,
  type FormResult,
} from '../_data/sampleData';

interface EPACheckSummary {
  totalComments: number;
  flaggedComments: number;
  topReason: string | null;
}

interface DemoEPABoxProps {
  epaId: number;
  kfAvgData: Record<string, number>;
  llmFeedback: string;
  formResults: FormResult[];
  reportCreatedAt: string;
  timeRange: 3 | 6 | 12;
  check?: EPACheckSummary;
  onEditClick: () => void;
}

function extractFeedback(llmFeedback: string, epaId: number): string | null {
  try {
    const obj = JSON.parse(llmFeedback) as Record<string, string>;
    if ('_error' in obj) return null;
    const entries = Object.entries(obj).filter(([k]) => parseInt(k.split('.')[0]) === epaId);
    return entries.map(([, v]) => v).join('\n\n') || null;
  } catch {
    return null;
  }
}

const DemoEPABox: React.FC<DemoEPABoxProps> = ({
  epaId,
  kfAvgData,
  llmFeedback,
  formResults,
  reportCreatedAt,
  timeRange,
  check,
  onEditClick,
}) => {
  const [expanded, setExpanded] = useState(false);

  const epaAvg = computeEPAAverage(kfAvgData, epaId);
  const kfKeys = Object.keys(kfAvgData).filter((k) => k.startsWith(`${epaId}.`)).sort();
  const kfDescs = KF_DESCRIPTIONS[epaId] ?? [];
  const feedback = extractFeedback(llmFeedback, epaId);
  const title = EPA_TITLES[epaId] ?? `EPA ${epaId}`;
  const flagged = !!check && check.flaggedComments > 0;

  // Build line graph data from form results for this EPA
  const reportDate = new Date(reportCreatedAt);
  const cutoff = new Date(reportCreatedAt);
  cutoff.setMonth(cutoff.getMonth() - timeRange);

  const graphData = formResults
    .filter((f) => {
      const d = new Date(f.created_at);
      return d >= cutoff && d <= reportDate && Object.keys(f.results).some((k) => k.startsWith(`${epaId}.`));
    })
    .map((f) => {
      const keys = Object.keys(f.results).filter((k) => k.startsWith(`${epaId}.`));
      const avg = keys.reduce((sum, k) => sum + f.results[k], 0) / keys.length;
      return { date: f.created_at, value: Math.floor(avg) };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className={`card mb-3 shadow-sm ${flagged ? 'border-danger' : ''}`} style={{ borderRadius: '0.75rem' }}>
      {/* Header */}
      <div
        className='card-header d-flex justify-content-between align-items-center'
        style={{ cursor: 'pointer', borderRadius: '0.75rem 0.75rem 0 0' }}
        onClick={() => setExpanded((p) => !p)}
      >
        <div className='d-flex align-items-center gap-3'>
          <div className='d-flex align-items-center gap-2 fw-semibold'>
            <span
              className='badge text-white'
              style={{ backgroundColor: '#1a4c8a', fontSize: '0.85rem', padding: '0.35rem 0.6rem' }}
            >
              EPA {epaId}
            </span>
            <span className='text-body'>{title}</span>
          </div>
          {flagged && check && (
            <span
              style={{
                fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: 999,
                border: '1px solid rgba(220,53,69,0.5)', background: 'rgba(220,53,69,0.12)',
                color: 'rgb(220,53,69)', fontWeight: 600,
              }}
            >
              ⚑ {check.flaggedComments}/{check.totalComments} flagged
              {check.topReason ? ` · ${check.topReason}` : ''}
            </span>
          )}
        </div>
        <div className='d-flex align-items-center gap-2'>
          <button
            className='btn btn-sm btn-outline-primary d-print-none'
            onClick={(e) => { e.stopPropagation(); onEditClick(); }}
          >
            Edit EPA {epaId}
          </button>
          <span className='text-muted small'>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className='card-body'>
          <div className='row g-3'>
            {/* Gauge + KF scores */}
            <div className='col-md-5'>
              <div className='d-flex flex-column align-items-center mb-3'>
                <HalfCircleGauge average={epaAvg} allGreen={epaAvg === 3} />
                {epaAvg !== null && (
                  <span className='badge text-white mt-1' style={{ backgroundColor: DEV_LEVEL_COLORS[epaAvg] }}>
                    {DEV_LEVEL_LABELS[epaAvg]}
                  </span>
                )}
              </div>

              {/* KF score table */}
              {kfKeys.map((key, i) => {
                const score = Math.floor(kfAvgData[key]);
                const desc = kfDescs[i] ?? key;
                return (
                  <div key={key} className='d-flex justify-content-between align-items-center py-1 border-bottom'>
                    <small className='text-muted me-2' style={{ flex: 1 }}>{desc}</small>
                    <span
                      className='badge text-white flex-shrink-0'
                      style={{ backgroundColor: DEV_LEVEL_COLORS[score] ?? '#999' }}
                    >
                      {DEV_LEVEL_LABELS[score] ?? score}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Line graph + AI feedback */}
            <div className='col-md-7'>
              {graphData.length > 1 && (
                <div className='mb-3'>
                  <small className='text-muted d-block mb-1'>Assessment trend</small>
                  <LineGraph
                    data={graphData}
                    windowStart={cutoff.toISOString()}
                    windowEnd={reportDate.toISOString()}
                  />
                </div>
              )}

              {feedback ? (
                <div className='border rounded p-3' style={{ fontSize: '0.88rem', background: 'var(--bs-body-bg)' }}>
                  <div className='fw-semibold mb-2 text-muted small'>AI-Generated Feedback</div>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{feedback}</ReactMarkdown>
                </div>
              ) : (
                <div className='text-muted small'>No AI feedback available for this EPA.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoEPABox;
