import React from 'react';
import { render, screen } from '@testing-library/react';

import EPAprogress from '@/components/(StudentComponents)/EPAprogress';
import LineGraph from '@/components/(StudentComponents)/LineGraph';

describe('Student graph component coverage', () => {
  test('LineGraph shows empty-state message when no data is provided', () => {
    render(<LineGraph data={[]} />);
    expect(screen.getByText('No data to display')).toBeInTheDocument();
  });

  test('LineGraph shows no-assessment message when dates are invalid', () => {
    render(<LineGraph data={[{ date: 'invalid-date', value: 2 }]} />);
    expect(screen.getByText('No assessment data available')).toBeInTheDocument();
  });

  test('LineGraph renders axis labels and trend when valid data exists', () => {
    render(
      <LineGraph
        data={[
          { date: '2026-01-10', value: 1 },
          { date: '2026-02-10', value: 2 },
          { date: '2026-03-10', value: 3 },
        ]}
      />,
    );

    expect(screen.getByText('Remedial')).toBeInTheDocument();
    expect(screen.getByText('Early-Developing')).toBeInTheDocument();
    expect(screen.getByText('Developing')).toBeInTheDocument();
    expect(screen.getByText('Entrustable')).toBeInTheDocument();

    // SVG exists when trend graph renders.
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  test('EPAprogress renders title, EPA labels, legends, and progress bars', () => {
    render(<EPAprogress />);

    expect(screen.getByText('EPA Competency Progress (By Key Function)')).toBeInTheDocument();

    expect(screen.getByText('EPA 1')).toBeInTheDocument();
    expect(screen.getByText('EPA 2')).toBeInTheDocument();
    expect(screen.getByText('EPA 3')).toBeInTheDocument();
    expect(screen.getByText('EPA 4')).toBeInTheDocument();
    expect(screen.getByText('EPA 5')).toBeInTheDocument();

    expect(screen.getByText('none')).toBeInTheDocument();
    expect(screen.getByText('remedial')).toBeInTheDocument();
    expect(screen.getByText('early-developing')).toBeInTheDocument();
    expect(screen.getByText('developing')).toBeInTheDocument();
    expect(screen.getByText('entrustable')).toBeInTheDocument();

    expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(10);
  });
});
