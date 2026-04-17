/** @jest-environment jsdom */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockAuthorize = jest.fn();
const mockGetEPAKFDescs = jest.fn();
const mockGetLatestMCQs = jest.fn();
const mockGetKFSampleCounts = jest.fn();
const mockSubmitSample = jest.fn();
const mockGetDevLevelInt = jest.fn(() => 2);

jest.mock('@/utils/async-util', () => ({
  supabase_authorize: (...args: unknown[]) => mockAuthorize(...args),
}));

jest.mock('@/utils/get-epa-data', () => ({
  getEPAKFDescs: () => mockGetEPAKFDescs(),
  getLatestMCQs: () => mockGetLatestMCQs(),
  getKFSampleCounts: () => mockGetKFSampleCounts(),
}));

jest.mock('@/utils/util', () => ({
  getDevLevelInt: (...args: unknown[]) => mockGetDevLevelInt(...args),
  getSecureRandomFloat: () => 0,
}));

jest.mock('@/app/dashboard/admin/form/actions', () => ({
  submitSample: (...args: unknown[]) => mockSubmitSample(...args),
}));

import Form from '@/app/dashboard/admin/form/page';

describe('admin form page coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetEPAKFDescs.mockResolvedValue({
      epa_desc: { 1: 'EPA 1 description' },
      kf_desc: { '1.1': 'KF 1.1 description' },
    });

    mockGetLatestMCQs.mockResolvedValue([
      {
        id: 10,
        epa: 1,
        kf: '1.1',
        question: 'Which actions apply?',
        options: {
          '1.1': 'Option A',
          '1.2': 'Option B',
        },
      },
    ]);

    mockGetKFSampleCounts.mockResolvedValue([{ kf: 'mcq_kf1_1', count: 3 }]);
    mockSubmitSample.mockResolvedValue(true);
  });

  it('renders unauthorized message when user is not authorized', async () => {
    mockAuthorize.mockResolvedValue(false);

    render(<Form />);

    await waitFor(() => {
      expect(screen.getByText(/you are not authorized to perform this action/i)).toBeInTheDocument();
    });
  });

  it('renders question content and allows submit flow for authorized user', async () => {
    mockAuthorize.mockResolvedValue(true);

    render(<Form />);

    await waitFor(() => {
      expect(screen.getByText('Which actions apply?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
    });

    fireEvent.click(screen.getByLabelText('Dev'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(mockSubmitSample).toHaveBeenCalledWith(
        'mcq_kf1_1',
        expect.objectContaining({
          c1_1: false,
          c1_2: false,
          dev_level: 2,
        }),
      );
    });

    // Called once on mount and once after successful submit refresh.
    expect(mockGetKFSampleCounts).toHaveBeenCalledTimes(2);
  });

  it('skip button fetches a new question set without submitting', async () => {
    mockAuthorize.mockResolvedValue(true);

    render(<Form />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /skip/i }));

    await waitFor(() => {
      expect(mockSubmitSample).not.toHaveBeenCalled();
      expect(mockGetLatestMCQs).toHaveBeenCalled();
    });
  });
});
