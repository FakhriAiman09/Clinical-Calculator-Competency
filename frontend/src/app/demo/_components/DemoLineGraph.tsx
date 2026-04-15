'use client';

import React from 'react';
import LineGraph from '@/components/(StudentComponents)/LineGraph';

interface DemoLineGraphProps {
  data: { date: string; value: number }[];
}

const DemoLineGraph: React.FC<DemoLineGraphProps> = ({ data }) => {
  return <LineGraph data={data} />;
};

export default DemoLineGraph;
