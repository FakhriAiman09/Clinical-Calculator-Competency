import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import EPAModal from '@/components/(StudentComponents)/EPAModal';

describe('EPAModal coverage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-17T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns null when no EPA is selected', () => {
    const onClose = jest.fn();
    const { container } = render(<EPAModal selectedEpa={null} onClose={onClose} range={3} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows no assessments message when all entries are outside range or invalid', () => {
    const onClose = jest.fn();
    render(
      <EPAModal
        selectedEpa={{
          epa: 1,
          keyFunctions: [
            {
              id: '1-1',
              description: 'History taking',
              history: [
                { date: '2025-01-01T09:00:00.000Z', level: 'developing' },
                { date: '2026-04-16T09:00:00.000Z', level: 'none' },
                { date: '2026-04-16T09:01:00.000Z', level: 'unknown-level' },
              ],
            },
          ],
        }}
        onClose={onClose}
        range={1}
      />
    );

    expect(screen.getByText('No assessments in this time range.')).toBeInTheDocument();
  });

  it('renders grouped timestamp blocks and level badges', () => {
    const onClose = jest.fn();
    render(
      <EPAModal
        selectedEpa={{
          epa: 2,
          keyFunctions: [
            {
              id: '2-1',
              description: 'Clinical reasoning',
              history: [
                { date: '2026-04-12T09:00:00.000Z', level: 'developing' },
                { date: '2026-04-12T15:30:00.000Z', level: 'entrustable' },
              ],
            },
          ],
        }}
        onClose={onClose}
        range={6}
      />
    );

    expect(screen.getByText('EPA 2 Key Functions')).toBeInTheDocument();
    expect(screen.getAllByText('Clinical reasoning').length).toBeGreaterThan(0);
    expect(screen.getByText('Developing')).toBeInTheDocument();
    expect(screen.getByText('Entrustable')).toBeInTheDocument();

    const labels = screen.getAllByText(/April/i);
    expect(labels.length).toBeGreaterThan(0);
    expect(labels[0].textContent?.includes(',')).toBe(true);
  });

  it('closes when overlay, close button, footer button, or Escape is used', () => {
    const onClose = jest.fn();
    render(
      <EPAModal
        selectedEpa={{
          epa: 3,
          keyFunctions: [
            {
              id: '3-1',
              description: 'Orders',
              history: [{ date: '2026-04-10T09:00:00.000Z', level: 'early-developing' }],
            },
          ],
        }}
        onClose={onClose}
        range={6}
      />
    );

    fireEvent.click(screen.getByLabelText('Close EPA key functions'));
    fireEvent.click(screen.getByLabelText('Close'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[1]);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(4);
  });
});
