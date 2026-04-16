import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// Mock role guard so page can render in test environment.
jest.mock('@/utils/useRequiredRole', () => ({
  useRequireRole: jest.fn(),
}));

// Mock logged-in user context for rater workflow.
jest.mock('@/context/UserContext', () => ({
  useUser: () => ({ user: { id: 'rater-1' } }),
}));

// Mock AI preference hook and usage counter.
const incrementUsageMock = jest.fn(async () => {});
jest.mock('@/utils/useAIPreferences', () => ({
  useAIPreferences: () => ({ model: 'z-ai/glm-4.5-air:free', incrementUsage: incrementUsageMock }),
}));

// Mock route query and router methods used by the page.
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (k: string) => (k === 'id' ? 'req-1' : null) }),
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));

// Mock debounce to run immediately in tests.
jest.mock('lodash', () => ({
  debounce: (fn: (...args: unknown[]) => void) => fn,
}));

// Mock MCQ source data to keep EPA rendering deterministic.
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

// Mock outbound email side effect after rater actions.
jest.mock('@/app/dashboard/rater/form/rater-email-api/send-email-rater.server', () => ({
  sendEmail: jest.fn(),
}));

// Mock Supabase table reads used by the form page.
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

// Mock RPC call for profile lookup.
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

// Test suite for AI comment actions in the rater form.
describe('Functional requirement: rater AI comment actions', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  // Reset mocks and browser globals before each test.
  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
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
        observe = jest.fn();
        disconnect = jest.fn();
        unobserve = jest.fn();
      },
      writable: true,
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  // Shared helper: open one EPA, enter a comment, generate AI summary, return textarea.
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

  // Verifies Insert appends AI summary while keeping original text.
  test('supports Insert action to append AI summary', async () => {
    const textarea = await openOneEPAAndGenerateSummary();

    fireEvent.click(screen.getByText('Insert'));

    await waitFor(() => {
      expect(textarea.value).toContain('Original comment from rater.');
      expect(textarea.value).toContain('AI concise summary.');
    });
  });

  // Verifies Replace swaps original comment with AI summary text.
  test('supports Replace action to replace comment with AI summary', async () => {
    const textarea = await openOneEPAAndGenerateSummary();

    fireEvent.click(screen.getByText('Replace'));

    await waitFor(() => {
      expect(textarea.value).toBe('AI concise summary.\n');
    });
  });

  // Verifies original text remains unchanged if user does not pick Insert/Replace.
  test('supports reject behavior by keeping original text when no action is chosen', async () => {
    const textarea = await openOneEPAAndGenerateSummary();

    await waitFor(() => {
      expect(textarea.value).toBe('Original comment from rater.');
      expect(screen.getByText('AI concise summary.')).toBeInTheDocument();
    });
  });
});
