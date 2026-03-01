'use client';

import React from 'react';

interface LineGraphProps {
  data: { date: string; value: number }[];
}

const LineGraph: React.FC<LineGraphProps> = ({ data }) => {
  const width = 600;
  const height = 200;
  const labelPadding = 105;
  const rightPadding = 10;
  const topPadding = 20;
  const bottomPadding = 30;

  if (!data.length) return <div className='text-muted'>No data to display</div>;

  const buckets: Record<string, number[]> = {};
  const firstDate = new Date(Math.min(...data.map((d) => new Date(d.date).getTime())));
  const now = new Date();

  const intervals: { label: string; start: Date }[] = [];
  const current = new Date(firstDate.getFullYear(), Math.floor(firstDate.getMonth() / 3) * 3, 1);
  while (current <= now) {
    const label = `${current.toLocaleString('default', { month: 'short' })} '${String(current.getFullYear()).slice(-2)}`;
    intervals.push({ label, start: new Date(current) });
    current.setMonth(current.getMonth() + 3);
  }

  intervals.forEach(({ start }) => {
    const end = new Date(start);
    end.setMonth(start.getMonth() + 3);
    const key = start.toISOString();
    buckets[key] = data
      .filter((d) => {
        const date = new Date(d.date);
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

  // Not enough data to draw a meaningful trend line
  if (pointsWithData.length < 2) {
    return (
      <div
        className='d-flex align-items-center justify-content-center text-muted'
        style={{ height: 80, fontSize: '0.85rem', fontStyle: 'italic' }}
      >
        More assessments needed to show a trend
      </div>
    );
  }

  const scaleX = (i: number) => labelPadding + (i / Math.max(bucketData.length - 1, 1)) * (width - labelPadding - rightPadding);
  const scaleY = (val: number) => topPadding + (1 - val / 3) * (height - topPadding - bottomPadding);

  return (
    <svg width='100%' height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* transparent background - inherits from card */}
      <rect width='100%' height='100%' fill='transparent' />

      {[0, 1, 2, 3].map((level) => {
        const y = scaleY(level);
        return (
          <g key={level}>
            <text
              x={labelPadding - 10} y={y} fontSize={11}
              fill='currentColor' opacity={0.6}
              alignmentBaseline='middle' textAnchor='end'
            >
              {['Remedial', 'Early-Developing', 'Developing', 'Entrustable'][level]}
            </text>
            <line x1={labelPadding} x2={width - rightPadding} y1={y} y2={y} stroke='currentColor' opacity={0.15} strokeDasharray='4' />
          </g>
        );
      })}

      {bucketData.map(({ label }, i) => (
        <text
          key={i} x={scaleX(i)} y={height - 5} fontSize={10}
          fill='currentColor' opacity={0.6}
          textAnchor={i === 0 ? 'start' : i === bucketData.length - 1 ? 'end' : 'middle'}
        >
          {label}
        </text>
      ))}

      <polyline
        fill='none'
        stroke='#007bff'
        strokeWidth='2'
        points={bucketData
          .map((pt, i) => (pt.value !== null ? `${scaleX(i)},${scaleY(pt.value)}` : ''))
          .filter(Boolean)
          .join(' ')}
      />

      {bucketData.map((pt, i) =>
        pt.value !== null ? (
          <g key={i}>
            <circle cx={scaleX(i)} cy={scaleY(pt.value)} r={4} fill='#007bff' />
            {i === bucketData.length - 1 && (
              <circle cx={scaleX(i)} cy={scaleY(pt.value)} r={7} fill='none' stroke='#28a745' strokeWidth={2} />
            )}
          </g>
        ) : null
      )}
    </svg>
  );
};

export default LineGraph;