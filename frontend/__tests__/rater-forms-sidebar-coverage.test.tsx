import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@/utils/useRequiredRole', () => ({
  useRequireRole: jest.fn(),
}));

jest.mock('@/context/UserContext', () => ({
  useUser: () => ({ user: { id: 'rater-1' } }),
}));

jest.mock('@/utils/useAIPreferences', () => ({
  useAIPreferences: () => ({ model: 'z-ai/glm-4.5-air:free', incrementUsage: jest.fn(async () => {}) }),
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
  data: [{ user_id: 'student-1', display_name: 'Student One', email: 'student1@test.com' }],
  error: null,
}));

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({ from: fromMock, rpc: rpcMock }),
}));

import RaterFormsPage from '@/app/dashboard/rater/form/RaterFormsPage';

describe('RaterFormsPage sidebar interactions', () => {
  const intersectionCallbacks: Array<(entries: Array<{ target: Element; isIntersecting: boolean }>) => void> = [];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    intersectionCallbacks.length = 0;

    Object.defineProperty(window, 'scrollTo', {
      value: jest.fn(),
      writable: true,
    });

    Object.defineProperty(globalThis, 'IntersectionObserver', {
      value: class {
        private readonly cb: (entries: Array<{ target: Element; isIntersecting: boolean }>) => void;

        constructor(cb: (entries: Array<{ target: Element; isIntersecting: boolean }>) => void) {
          this.cb = cb;
          intersectionCallbacks.push(cb);
        }

        observe = jest.fn((el?: Element) => {
          if (el) this.cb([{ target: el, isIntersecting: false }]);
        });
        disconnect = jest.fn();
        unobserve = jest.fn();
      },
      writable: true,
    });

    Object.defineProperty(globalThis, 'fetch', {
      value: jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ summary: 'summary' }),
      })),
      writable: true,
    });
  });

  test('covers sidebar resize handle and toggle branch', async () => {
    const { container } = render(<RaterFormsPage />);

    await waitFor(() => {
      expect(screen.getByText('Submit Selection')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /EPA\s*1/i }));
    const epaSidebarItem = screen
      .getAllByRole('button', { name: /EPA\s*1/i })
      .find((el) => el.tagName === 'LI') as HTMLElement;
    fireEvent.keyDown(epaSidebarItem, { key: ' ' });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Selection' }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Additional comments ...')).toBeInTheDocument();
    });

    const optionCheckbox = screen.getByRole('checkbox', { name: 'Observed' });
    fireEvent.click(optionCheckbox);

    const separator = screen
      .getAllByRole('separator')
      .find((el) => el.getAttribute('aria-orientation') === 'vertical') as HTMLElement;
    expect(separator).toBeTruthy();
    fireEvent.mouseEnter(separator);
    fireEvent.mouseLeave(separator);

    fireEvent.mouseDown(separator, { clientX: 180 });
    fireEvent.mouseMove(window, { clientX: 240 });
    fireEvent.mouseUp(window);

    const toggleButton = container.querySelector("[role='separator'] button") as HTMLButtonElement;
    expect(toggleButton).toBeTruthy();
    fireEvent.click(toggleButton);
    fireEvent.click(toggleButton);

    fireEvent.click(screen.getByRole('button', { name: 'Mark as Completed' }));

    const professionalismItem = screen.getByRole('button', { name: /Professionalism Assessment/i });
    fireEvent.click(professionalismItem);
    fireEvent.keyDown(professionalismItem, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText("Please describe the student's professionalism:")).toBeInTheDocument();
    });

    expect(intersectionCallbacks.length).toBeGreaterThan(0);
  });
});
