import React, { useEffect, useState } from 'react';

export interface HalfCircleGaugeProps {
  average: number | null;
  allGreen: boolean;
}

const devLevelLabels = ['Remedial', 'Early-Developing', 'Developing', 'Entrustable'];
const devLevelColors = ['#ea3636', '#ffb800', '#90ee90', '#3ead16'];
const gaugeGrey = '#cccccc';

const needleAngles = [23, 68, 113, 158];

const HalfCircleGauge: React.FC<HalfCircleGaugeProps> = ({ average }) => {
  const width = 140;
  const height = 80;
  const cx = width / 2;
  const cy = height;
  const radius = 60;

  const [needleAngleDeg, setNeedleAngleDeg] = useState(180);

  useEffect(() => {
    if (average === null) {
      setNeedleAngleDeg(0);
    } else {
      setNeedleAngleDeg(needleAngles[average]);
    }
  }, [average]);

  return (
    <svg
      width={width}
      height={height + 20}
      viewBox={`0 0 ${width} ${height + 20}`}
      role='img'
      aria-label='Development gauge'
    >
      {[0, 1, 2, 3].map((i) => {
        const startAngle = Math.PI + (i * Math.PI) / 4;
        const endAngle = Math.PI + ((i + 1) * Math.PI) / 4;
        const x1 = cx + radius * Math.cos(startAngle);
        const y1 = cy + radius * Math.sin(startAngle);
        const x2 = cx + radius * Math.cos(endAngle);
        const y2 = cy + radius * Math.sin(endAngle);

        return (
          <path
            key={i}
            d={`M${x1},${y1} A${radius},${radius} 0 0 1 ${x2},${y2}`}
            fill='none'
            stroke={average === null ? gaugeGrey : devLevelColors[i]}
            strokeWidth='14'
          />
        );
      })}
      <g style={{ transition: 'transform 0.5s ease' }} transform={`rotate(${needleAngleDeg - 90}, ${cx}, ${cy})`}>
        {/* needle color uses currentColor so it adapts to light/dark */}
        <line x1={cx} y1={cy} x2={cx} y2={cy - radius} stroke='currentColor' strokeWidth='2' />
      </g>
      {/* label text uses currentColor */}
      <text x={cx} y={height + 15} textAnchor='middle' fontSize='12' fill='currentColor'>
        {average === null ? 'No Data' : devLevelLabels[average]}
      </text>
    </svg>
  );
};

export default HalfCircleGauge;