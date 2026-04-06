'use client';

import React from 'react';

interface LineGraphProps {
  data: { date: string; value: number }[];
  /** ISO date string — start of the x-axis window (inclusive). */
  windowStart: string;
  /** ISO date string — end of the x-axis window (inclusive). */
  windowEnd: string;
}

// ── FIX 2 (part 2): Replace every `currentColor` with explicit hex values.
//
// `currentColor` inherits the CSS text colour of the nearest ancestor.  In a
// normal browser session that works fine, but when the browser invokes the
// print engine (window.print / "Save as PDF") the colour-inheritance chain
// can resolve to a very light or transparent value — making axis labels,
// grid lines, and the polyline invisible in the resulting PDF.
//
// Using hardcoded values guarantees the graph looks identical on screen and
// in print regardless of the surrounding Bootstrap theme.
const LABEL_COLOR  = '#555555';   // axis labels
const GRID_COLOR   = '#cccccc';   // dashed grid lines
const LINE_COLOR   = '#007bff';   // trend line + filled dots
const LATEST_RING  = '#28a745';   // green ring on last data point

const LineGraph: React.FC<LineGraphProps> = ({ data, windowStart, windowEnd }) => {
  const width         = 600;
  const height        = 200;
  const labelPadding  = 105;
  const rightPadding  = 10;
  const topPadding    = 20;
  const bottomPadding = 30;

  if (!data.length) return <div className='text-muted'>No data to display</div>;

  // Parse YYYY-MM-DD strings as local time (not UTC) to avoid timezone month-shift.
  const parseLocalDate = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  // Build month intervals spanning the full window, not just data range.
  const winStart = new Date(windowStart);
  const winEnd   = new Date(windowEnd);
  const startMonth = new Date(winStart.getFullYear(), winStart.getMonth(), 1);
  const endMonth   = new Date(winEnd.getFullYear(),   winEnd.getMonth(),   1);

  const buckets: Record<string, number[]> = {};
  const intervals: { label: string; start: Date }[] = [];
  const current = new Date(startMonth);
  while (current <= endMonth) {
    const label = `${current.toLocaleString('default', { month: 'short' })} '${String(current.getFullYear()).slice(-2)}`;
    intervals.push({ label, start: new Date(current) });
    current.setMonth(current.getMonth() + 1);
  }

  intervals.forEach(({ start }) => {
    const end = new Date(start);
    end.setMonth(start.getMonth() + 1);
    const key = start.toISOString();
    buckets[key] = data
      .filter((d) => {
        const date = parseLocalDate(d.date);
        return date >= start && date < end;
      })
      .map((d) => d.value);
  });

  const bucketData = intervals.map(({ label, start }) => {
    const values = buckets[start.toISOString()] || [];
    const avg = values.length > 0 ? Math.floor(values.reduce((a, b) => a + b, 0) / values.length) : null;
    return { label, value: avg, date: start };
  });

  const pointsWithData = bucketData.filter((d) => d.value !== null);

  if (pointsWithData.length < 1) {
    return (
      <div
        className='d-flex align-items-center justify-content-center text-muted'
        style={{ height: 80, fontSize: '0.85rem', fontStyle: 'italic' }}
      >
        No assessment data available
      </div>
    );
  }

  const scaleX = (i: number) =>
    labelPadding + (i / Math.max(bucketData.length - 1, 1)) * (width - labelPadding - rightPadding);
  const scaleY = (val: number) =>
    topPadding + (1 - val / 3) * (height - topPadding - bottomPadding);

  return (
    <svg width='100%' height={height} viewBox={`0 0 ${width} ${height}`}>
      <rect width='100%' height='100%' fill='transparent' />

      {/* Horizontal grid lines + Y-axis labels */}
      {[0, 1, 2, 3].map((level) => {
        const y = scaleY(level);
        return (
          <g key={level}>
            <text
              x={labelPadding - 10}
              y={y}
              fontSize={11}
              fill={LABEL_COLOR}
              alignmentBaseline='middle'
              textAnchor='end'
            >
              {['Remedial', 'Early-Developing', 'Developing', 'Entrustable'][level]}
            </text>
            <line
              x1={labelPadding}
              x2={width - rightPadding}
              y1={y}
              y2={y}
              stroke={GRID_COLOR}
              strokeDasharray='4'
            />
          </g>
        );
      })}

      {/* X-axis labels */}
      {bucketData.map(({ label }, i) => (
        <text
          key={i}
          x={scaleX(i)}
          y={height - 5}
          fontSize={10}
          fill={LABEL_COLOR}
          textAnchor={i === 0 ? 'start' : i === bucketData.length - 1 ? 'end' : 'middle'}
        >
          {label}
        </text>
      ))}

      {/* Trend line */}
      <polyline
        fill='none'
        stroke={LINE_COLOR}
        strokeWidth='2'
        points={bucketData
          .map((pt, i) => (pt.value !== null ? `${scaleX(i)},${scaleY(pt.value)}` : ''))
          .filter(Boolean)
          .join(' ')}
      />

      {/* Data-point dots */}
      {bucketData.map((pt, i) =>
        pt.value !== null ? (
          <g key={i}>
            <circle cx={scaleX(i)} cy={scaleY(pt.value)} r={4} fill={LINE_COLOR} />
            {i === bucketData.length - 1 && (
              <circle
                cx={scaleX(i)}
                cy={scaleY(pt.value)}
                r={7}
                fill='none'
                stroke={LATEST_RING}
                strokeWidth={2}
              />
            )}
          </g>
        ) : null
      )}
    </svg>
  );
};

export default LineGraph;
