'use client';

import React from 'react';

interface DemoLineGraphProps {
  data: { date: string; value: number }[];
}

const LABEL_COLOR = '#555555';
const GRID_COLOR = '#cccccc';
const LINE_COLOR = '#007bff';
const LATEST_RING = '#28a745';

const DemoLineGraph: React.FC<DemoLineGraphProps> = ({ data }) => {
  const width = 600;
  const height = 200;
  const labelPadding = 105;
  const rightPadding = 10;
  const topPadding = 20;
  const bottomPadding = 30;

  if (!data.length) return <div className='text-muted'>No data to display</div>;

  const parseLocalDate = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const latestDataDate = data.reduce((max, d) => {
    const dt = parseLocalDate(d.date);
    return dt > max ? dt : max;
  }, parseLocalDate(data[0].date));
  const endMonth = new Date(latestDataDate.getFullYear(), latestDataDate.getMonth(), 1);
  const janOfEndYear = new Date(latestDataDate.getFullYear(), 0, 1);
  const twelveMonthsBack = new Date(endMonth.getFullYear(), endMonth.getMonth() - 11, 1);
  const startMonth = janOfEndYear > twelveMonthsBack ? janOfEndYear : twelveMonthsBack;

  const buckets: Record<string, number[]> = {};
  const intervals: { label: string; start: Date }[] = [];
  const current = new Date(startMonth);
  while (current <= endMonth) {
    const label = current.toLocaleString('default', { month: 'short', year: '2-digit' });
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

      <polyline
        fill='none'
        stroke={LINE_COLOR}
        strokeWidth='2'
        points={bucketData
          .map((pt, i) => (pt.value !== null ? `${scaleX(i)},${scaleY(pt.value)}` : ''))
          .filter(Boolean)
          .join(' ')}
      />

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

export default DemoLineGraph;
