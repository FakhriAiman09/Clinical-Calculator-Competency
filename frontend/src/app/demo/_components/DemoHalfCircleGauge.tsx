import React from 'react';
import HalfCircleGauge from '@/components/(StudentComponents)/HalfCircleGauge';

export interface DemoHalfCircleGaugeProps {
  average: number | null;
  allGreen: boolean;
}

const DemoHalfCircleGauge: React.FC<DemoHalfCircleGaugeProps> = ({ average, allGreen }) => {
  return <HalfCircleGauge average={average} allGreen={allGreen} />;
};

export default DemoHalfCircleGauge;
