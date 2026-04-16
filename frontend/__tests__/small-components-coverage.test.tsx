import React from 'react';
import { render, screen } from '@testing-library/react';

import {
  RemedialIcon,
  EarlyDevelopingIcon,
  DevelopingIcon,
  EntrustableIcon,
} from '@/app/dashboard/admin/form/button-svgs';
import EpaKfDesc from '@/app/dashboard/admin/form/epa-kf-desc';
import DemoLayout, { metadata as demoMetadata } from '@/app/demo/layout';
import { metadata as appMetadata } from '@/app/layout';
import DemoHalfCircleGauge from '@/app/demo/_components/DemoHalfCircleGauge';

jest.mock('@/components/(StudentComponents)/HalfCircleGauge', () => ({
  __esModule: true,
  default: ({ average, allGreen }: { average: number | null; allGreen: boolean }) => (
    <div data-testid='half-circle-gauge'>
      avg:{String(average)};green:{String(allGreen)}
    </div>
  ),
}));

jest.mock('next/font/google', () => ({
  Inter: () => ({ className: 'mocked-inter' }),
}));

jest.mock('@/context/UserContext', () => ({
  __esModule: true,
  UserProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/context/ThemeContext', () => ({
  __esModule: true,
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/Header/header', () => ({
  __esModule: true,
  default: () => <div data-testid='mock-header'>Header</div>,
}));

jest.mock('@/components/bootstrap-client', () => ({
  __esModule: true,
  default: () => <div data-testid='mock-bootstrap-client' />,
}));

describe('button-svgs', () => {
  test('renders each icon as an svg', () => {
    const { container } = render(
      <div>
        <RemedialIcon size='16' />
        <EarlyDevelopingIcon size='16' />
        <DevelopingIcon size='16' />
        <EntrustableIcon size='16' />
      </div>,
    );

    expect(container.querySelectorAll('svg').length).toBe(4);
  });
});

describe('EpaKfDesc', () => {
  test('renders heading and sample badge when sample_count is present', () => {
    render(
      <EpaKfDesc
        desc={{
          epa: '1',
          kf: '1.1',
          epa_desc: 'EPA Description',
          kf_desc: 'KF Description',
          sample_count: 5,
        }}
      />,
    );

    expect(screen.getByText(/View EPA 1 and Key Function 1.1/i)).toBeInTheDocument();
    expect(screen.getByText('5 samples')).toBeInTheDocument();
    expect(screen.getByText(/EPA 1: EPA Description/i)).toBeInTheDocument();
  });

  test('omits sample badge text when sample_count is missing', () => {
    render(
      <EpaKfDesc
        desc={{
          epa: '2',
          kf: '2.1',
          epa_desc: 'Another EPA',
          kf_desc: 'Another KF',
          sample_count: undefined,
        }}
      />,
    );

    expect(screen.queryByText(/samples/i)).not.toBeInTheDocument();
  });
});

describe('Demo layout and metadata', () => {
  test('exports expected metadata titles', () => {
    expect(demoMetadata.title).toBe('CCC Admin Demo');
    expect(appMetadata.title).toBe('Clinical Competency Calculator');
  });

  test('renders demo banner, nav label, and child content', () => {
    render(
      <DemoLayout>
        <div>Child Content</div>
      </DemoLayout>,
    );

    expect(screen.getByText(/DEMO MODE/i)).toBeInTheDocument();
    expect(screen.getByText('CCC Admin Demo')).toBeInTheDocument();
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });
});

describe('DemoHalfCircleGauge', () => {
  test('passes average and allGreen to HalfCircleGauge', () => {
    render(<DemoHalfCircleGauge average={2.5} allGreen={true} />);

    expect(screen.getByTestId('half-circle-gauge')).toHaveTextContent('avg:2.5;green:true');
  });
});
