import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@/utils/useRequiredRole', () => ({
  useRequireRole: jest.fn(),
}));

jest.mock('@/context/UserContext', () => ({
  useUser: () => ({ user: { id: 'rater-1' } }),
}));

const incrementUsageMock = jest.fn(async () => {});
jest.mock('@/utils/useAIPreferences', () => ({
  useAIPreferences: () => ({ model: 'z-ai/glm-4.5-air:free', incrementUsage: incrementUsageMock }),
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (k: string) => (k === 'id' ? 'req-1' : null) }),
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));

jest.mock('lodash', () => ({
  debounce: (fn: (...args: unknown[]) => void) => fn,
}));

jest.mock('@/utils/get-epa-data', () => ({
  getLatestMCQs: jest.fn(async () => [
    {
      epa: '1',
      kf: '1',
      question: 'Describe clinical performance',
      options: {
        '1.1': 'Observed',
        '1.2': 'Needs support',
      },
    },
  ]),
}));

jest.mock('@/app/dashboard/rater/form/rater-email-api/send-email-rater.server', () => ({
  sendEmail: jest.fn(),
}));

const fromMock = jest.fn((table: string) => {
  if (table === 'form_requests') {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(async () => ({
            data: {
              id: 'req-1',
              created_at: '2026-03-01T00:00:00Z',
              student_id: 'student-1',
              completed_by: 'rater-1',
              clinical_settings: 'Clinic',
              notes: 'Observed in clinic',
              goals: 'Improve communication',
            },
            error: null,
          })),
        })),
      })),
    };
  }

  if (table === 'form_responses') {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(async () => ({ data: null, error: { message: 'Not found' } })),
        })),
      })),
    };
  }

  if (table === 'epa_kf_descriptions') {
    return {
      select: jest.fn(async () => ({
        data: [{ epa_descriptions: { '1': 'EPA One description' } }],
        error: null,
      })),
    };
  }

  return {
    select: jest.fn(async () => ({ data: [], error: null })),
  };
});

const rpcMock = jest.fn(async () => ({
  data: [
    { user_id: 'student-1', display_name: 'Student One', email: 'student1@test.com' },
  ],
  error: null,
}));

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    from: fromMock,
    rpc: rpcMock,
  }),
}));

import RaterFormsPage from '@/app/dashboard/rater/form/RaterFormsPage';

describe('Functional requirement: rater AI comment actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(global, 'fetch', {
      value: jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ summary: 'AI concise summary.' }),
      })),
      writable: true,
    });

    Object.defineProperty(window, 'scrollTo', {
      value: jest.fn(),
      writable: true,
    });

    Object.defineProperty(global, 'IntersectionObserver', {
      value: class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
      writable: true,
    });
  });

  async function openOneEPAAndGenerateSummary() {
    render(<RaterFormsPage />);

    await waitFor(() => {
      expect(screen.getByText('Submit Selection')).toBeInTheDocument();
    });

    const submitSelectionButton = screen.getByRole('button', { name: 'Submit Selection' });
    if (submitSelectionButton.hasAttribute('disabled')) {
      fireEvent.click(screen.getByRole('button', { name: /EPA\s*1/i }));
    }

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Submit Selection' })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit Selection' }));

    const textarea = await screen.findByPlaceholderText('Additional comments ...');
    fireEvent.change(textarea, { target: { value: 'Original comment from rater.' } });

    fireEvent.click(screen.getByTitle('Generate AI summary from comments'));

    await waitFor(() => {
      expect(screen.getByText('Summary')).toBeInTheDocument();
      expect(screen.getByText('Insert')).toBeInTheDocument();
      expect(screen.getByText('Replace')).toBeInTheDocument();
      expect(screen.getByText('AI concise summary.')).toBeInTheDocument();
    });

    return textarea as HTMLTextAreaElement;
  }

  test('supports Insert action to append AI summary', async () => {
    const textarea = await openOneEPAAndGenerateSummary();

    fireEvent.click(screen.getByText('Insert'));

    await waitFor(() => {
      expect(textarea.value).toContain('Original comment from rater.');
      expect(textarea.value).toContain('AI concise summary.');
    });
  });

  test('supports Replace action to replace comment with AI summary', async () => {
    const textarea = await openOneEPAAndGenerateSummary();

    fireEvent.click(screen.getByText('Replace'));

    await waitFor(() => {
      expect(textarea.value).toBe('AI concise summary.\n');
    });
  });

  test('supports reject behavior by keeping original text when no action is chosen', async () => {
    const textarea = await openOneEPAAndGenerateSummary();

    await waitFor(() => {
      expect(textarea.value).toBe('Original comment from rater.');
      expect(screen.getByText('AI concise summary.')).toBeInTheDocument();
    });
  });
});
