/**
 * Coverage tests for EPABox.tsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ── ESM / CSS mocks ────────────────────────────────────────────────────────
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='react-markdown'>{children}</div>
  ),
}));
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => {} }));
jest.mock('rehype-highlight', () => ({ __esModule: true, default: () => {} }));
jest.mock('highlight.js/styles/github.css', () => {});

jest.mock('@/components/(StudentComponents)/LineGraph', () => ({
  __esModule: true,
  default: ({ data }: { data: unknown }) => (
    <div data-testid='line-graph'>{JSON.stringify(data)}</div>
  ),
}));
jest.mock('@/components/(StudentComponents)/HalfCircleGauge', () => ({
  __esModule: true,
  default: ({ average }: { average: unknown }) => (
    <div data-testid='gauge'>{String(average)}</div>
  ),
}));

// ── Module-level supabase mock ─────────────────────────────────────────────
const mockFrom = jest.fn();
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getUser: jest.fn() },
  })),
}));

// ── Utility mocks ─────────────────────────────────────────────────────────
jest.mock('@/utils/epa-scoring', () => ({
  DEV_LEVEL_LABELS: { 0: 'Remedial', 1: 'Early Developing', 2: 'Developing', 3: 'Entrustable' },
  getEpaLevelFromScores: jest.fn((scores: number[]) => (scores.length ? 2 : null)),
}));
jest.mock('@/utils/report-feedback', () => ({
  getRawFeedback: jest.fn((raw: unknown) => raw ?? null),
  getRelevantFeedbackMarkdown: jest.fn((_raw: unknown, _epaId: unknown) =>
    _raw ? `Feedback for EPA ${_epaId}` : null,
  ),
}));
jest.mock('@/utils/report-response', () => ({
  extractCommentTextsForEpa: jest.fn(() => ['Great work on this EPA']),
}));

// ── Import after mocks ─────────────────────────────────────────────────────
import EPABox from '@/components/(StudentComponents)/EPABox';

// ── Helpers ────────────────────────────────────────────────────────────────
function setMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn(() => ({ matches })),
  });
}

function makeChain(resolvedValue: unknown) {
  const chain: Record<string, jest.Mock> = {};
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.single = jest.fn(() => Promise.resolve({ data: resolvedValue, error: null }));
  chain.update = jest.fn(() => chain);
  chain.returns = jest.fn(() => Promise.resolve({ data: resolvedValue, error: null }));
  return chain;
}

interface SetupOptions {
  titleData?: Record<string, unknown> | null;
  formResults?: unknown[] | null;
  reportData?: Record<string, unknown> | null;
}

function setupMocks({ titleData = { epa_descriptions: { '1': 'Patient Care' } }, formResults = [], reportData = null }: SetupOptions = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'epa_kf_descriptions') return makeChain(titleData);
    if (table === 'form_results') {
      const c = makeChain(formResults);
      c.returns = jest.fn(() => Promise.resolve({ data: formResults, error: null }));
      return c;
    }
    if (table === 'student_reports') return makeChain(reportData);
    if (table === 'form_responses') return makeChain(null);
    return makeChain(null);
  });
}

const defaultProps = {
  epaId: 1,
  timeRange: 3,
  kfDescriptions: { '1': ['KF Description 1', 'KF Description 2'] },
  studentId: 'student-uuid',
  reportId: 'report-uuid',
  reportCreatedAt: '2026-04-01T00:00:00Z',
  isAdmin: false,
  onCommentDeleted: jest.fn(),
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('EPABox – collapsed by default', () => {
  beforeEach(() => {
    setMatchMedia(false);
    setupMocks();
  });

  it('does not show card body when collapsed', () => {
    render(<EPABox {...defaultProps} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });

  it('calls epa_kf_descriptions on mount', async () => {
    render(<EPABox {...defaultProps} />);
    await waitFor(() => expect(mockFrom).toHaveBeenCalledWith('epa_kf_descriptions'));
  });

  it('expands on toggle button click', async () => {
    render(<EPABox {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByTestId('line-graph')).toBeInTheDocument());
  });
});

describe('EPABox – expanded (matchMedia print)', () => {
  beforeEach(() => {
    setMatchMedia(true);
    setupMocks({ reportData: { llm_feedback: '{"1": "Some AI feedback"}', kf_avg_data: { '1.1': 2, '1.2': 3 } } });
  });

  it('shows line graph when expanded', async () => {
    render(<EPABox {...defaultProps} />);
    await waitFor(() => expect(screen.getByTestId('line-graph')).toBeInTheDocument());
  });

  it('fetches form_results and student_reports', async () => {
    render(<EPABox {...defaultProps} />);
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('form_results');
      expect(mockFrom).toHaveBeenCalledWith('student_reports');
    });
  });

  it('shows Key Functions table with kf descriptions', async () => {
    render(<EPABox {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Key Functions')).toBeInTheDocument();
      expect(screen.getByText('KF Description 1')).toBeInTheDocument();
    });
  });

  it('shows no comments when none returned', async () => {
    render(<EPABox {...defaultProps} />);
    await waitFor(() => expect(screen.getByText('No comments found')).toBeInTheDocument());
  });

  it('shows HalfCircleGauge', async () => {
    render(<EPABox {...defaultProps} />);
    await waitFor(() => expect(screen.getByTestId('gauge')).toBeInTheDocument());
  });

  it('shows Retry button when llmFeedback is set', async () => {
    render(<EPABox {...defaultProps} />);
    await waitFor(() => expect(screen.getByTitle(/Retry AI summary/i)).toBeInTheDocument());
  });

  it('renders ReactMarkdown for normal feedback', async () => {
    render(<EPABox {...defaultProps} />);
    await waitFor(() => expect(screen.getByTestId('react-markdown')).toBeInTheDocument());
  });
});

describe('EPABox – null llmFeedback (generating)', () => {
  beforeEach(() => {
    setMatchMedia(true);
    setupMocks({ reportData: null });
  });

  it('shows generating spinner', async () => {
    render(<EPABox {...defaultProps} />);
    await waitFor(() => expect(screen.getByText(/Generating Feedback/i)).toBeInTheDocument());
  });

  it('shows Stop button', async () => {
    render(<EPABox {...defaultProps} />);
    await waitFor(() => expect(screen.getByTitle(/Stop generation/i)).toBeInTheDocument());
  });
});

describe('EPABox – error feedback', () => {
  beforeEach(() => {
    setMatchMedia(true);
  });

  it('shows error block when feedback starts with _error:', async () => {
    const { getRelevantFeedbackMarkdown } = require('@/utils/report-feedback') as { getRelevantFeedbackMarkdown: jest.Mock };
    getRelevantFeedbackMarkdown.mockReturnValueOnce('_error:Something went wrong');
    setupMocks({ reportData: { llm_feedback: '{"_error":"Something went wrong"}', kf_avg_data: {} } });
    render(<EPABox {...defaultProps} />);
    await waitFor(() => expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument());
  });
});

describe('EPABox – handleRegenerate', () => {
  it('calls student_reports update with Generating... on Retry click', async () => {
    setMatchMedia(true);
    setupMocks({ reportData: { llm_feedback: '{"1": "Existing feedback"}', kf_avg_data: {} } });
    render(<EPABox {...defaultProps} />);
    await waitFor(() => screen.getByTitle(/Retry AI summary/i));

    const eqMock = jest.fn(() => Promise.resolve({ error: null }));
    const updateMock = jest.fn(() => ({ eq: eqMock }));
    mockFrom.mockImplementation((table: string) => {
      if (table === 'student_reports') return { update: updateMock, select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => Promise.resolve({ data: null })) })) })) };
      return makeChain(null);
    });

    fireEvent.click(screen.getByTitle(/Retry AI summary/i));
    await waitFor(() => expect(updateMock).toHaveBeenCalledWith({ llm_feedback: 'Generating...' }));
  });
});

describe('EPABox – handleStop', () => {
  it('calls student_reports update when Stop is clicked', async () => {
    setMatchMedia(true);
    setupMocks({ reportData: null });
    render(<EPABox {...defaultProps} />);
    await waitFor(() => screen.getByTitle(/Stop generation/i));

    const eqMock = jest.fn(() => Promise.resolve({ error: null }));
    const updateMock = jest.fn(() => ({ eq: eqMock }));
    mockFrom.mockImplementation((table: string) => {
      if (table === 'student_reports') return { update: updateMock, select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => Promise.resolve({ data: null })) })) })) };
      return makeChain(null);
    });

    fireEvent.click(screen.getByTitle(/Stop generation/i));
    await waitFor(() => expect(updateMock).toHaveBeenCalled());
  });

  it('disables Stop button while stopping', async () => {
    setMatchMedia(true);
    setupMocks({ reportData: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'epa_kf_descriptions') return makeChain({ epa_descriptions: { '1': 'X' } });
      if (table === 'form_results') { const c = makeChain([]); c.returns = jest.fn(() => Promise.resolve({ data: [], error: null })); return c; }
      if (table === 'student_reports') {
        return {
          select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => new Promise(() => {})) })) })),
          update: jest.fn(() => ({ eq: jest.fn(() => new Promise(() => {})) })),
        };
      }
      return makeChain(null);
    });

    render(<EPABox {...defaultProps} />);
    await waitFor(() => screen.getByTitle(/Stop generation/i));
    fireEvent.click(screen.getByTitle(/Stop generation/i));
    await waitFor(() => expect(screen.getByTitle(/Stop generation/i)).toBeDisabled());
  });
});

describe('EPABox – isAdmin comment delete', () => {
  const formResultsRow = {
    response_id: 'resp-1',
    created_at: '2026-03-01T00:00:00Z',
    results: { '1.1': 2 },
    form_responses: {
      response: {},
      form_requests: { student_id: 'student-uuid', clinical_settings: 'Clinic' },
    },
  };

  beforeEach(() => {
    setMatchMedia(true);
  });

  it('shows delete button when isAdmin=true and comments present', async () => {
    setupMocks({ formResults: [formResultsRow], reportData: null });
    render(<EPABox {...defaultProps} isAdmin={true} />);
    await waitFor(() => expect(screen.getByTitle('Delete comment')).toBeInTheDocument());
  });

  it('does not show delete button when isAdmin=false', async () => {
    setupMocks({ formResults: [formResultsRow], reportData: null });
    render(<EPABox {...defaultProps} isAdmin={false} />);
    await waitFor(() => expect(screen.queryByTitle('Delete comment')).toBeNull());
  });

  it('calls form_responses update and onCommentDeleted after delete', async () => {
    const onCommentDeleted = jest.fn();
    const responseData = {
      response: { response: { '1': { kf1: { text: ['Great work on this EPA'] } } } },
    };
    const eqMock = jest.fn(() => Promise.resolve({ error: null }));
    const updateMock = jest.fn(() => ({ eq: eqMock }));

    mockFrom.mockImplementation((table: string) => {
      if (table === 'epa_kf_descriptions') return makeChain({ epa_descriptions: { '1': 'Patient Care' } });
      if (table === 'form_results') {
        const c = makeChain([formResultsRow]);
        c.returns = jest.fn(() => Promise.resolve({ data: [formResultsRow], error: null }));
        return c;
      }
      if (table === 'student_reports') return makeChain(null);
      if (table === 'form_responses') {
        return {
          select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn(() => Promise.resolve({ data: responseData, error: null })) })) })),
          update: updateMock,
        };
      }
      return makeChain(null);
    });

    render(<EPABox {...defaultProps} isAdmin={true} onCommentDeleted={onCommentDeleted} />);
    await waitFor(() => screen.getByTitle('Delete comment'));
    fireEvent.click(screen.getByTitle('Delete comment'));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalled();
      expect(onCommentDeleted).toHaveBeenCalled();
    });
  });
});

describe('EPABox – print event listeners', () => {
  it('expands on beforeprint if collapsed', async () => {
    setMatchMedia(false);
    setupMocks();
    render(<EPABox {...defaultProps} />);
    expect(screen.getAllByRole('button')[0]).toHaveAttribute('aria-expanded', 'false');

    await act(async () => { fireEvent(window, new Event('beforeprint')); });
    expect(screen.getAllByRole('button')[0]).toHaveAttribute('aria-expanded', 'true');
  });

  it('collapses on afterprint if auto-expanded', async () => {
    setMatchMedia(false);
    setupMocks();
    render(<EPABox {...defaultProps} />);

    await act(async () => { fireEvent(window, new Event('beforeprint')); });
    expect(screen.getAllByRole('button')[0]).toHaveAttribute('aria-expanded', 'true');

    await act(async () => { fireEvent(window, new Event('afterprint')); });
    expect(screen.getAllByRole('button')[0]).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('EPABox – parseRowsIntoAssessmentsAndComments filters', () => {
  beforeEach(() => setMatchMedia(true));

  it('filters out rows from different student', async () => {
    setupMocks({
      formResults: [{
        response_id: 'r1',
        created_at: '2026-03-01T00:00:00Z',
        results: { '1.1': 3 },
        form_responses: { response: {}, form_requests: { student_id: 'OTHER', clinical_settings: null } },
      }],
      reportData: null,
    });
    render(<EPABox {...defaultProps} />);
    await waitFor(() => expect(screen.getByText('No comments found')).toBeInTheDocument());
  });

  it('filters out rows after reportCreatedAt', async () => {
    setupMocks({
      formResults: [{
        response_id: 'r2',
        created_at: '2030-01-01T00:00:00Z',
        results: { '1.1': 2 },
        form_responses: { response: {}, form_requests: { student_id: 'student-uuid', clinical_settings: null } },
      }],
      reportData: null,
    });
    render(<EPABox {...defaultProps} />);
    await waitFor(() => expect(screen.getByText('No comments found')).toBeInTheDocument());
  });
});

describe('EPABox – buildGraphData via lineGraph', () => {
  it('passes monthly bucketed data to LineGraph', async () => {
    setMatchMedia(true);
    setupMocks({
      formResults: [{
        response_id: 'r3',
        created_at: '2026-02-14T00:00:00Z',
        results: { '1.1': 2, '1.2': 3 },
        form_responses: { response: {}, form_requests: { student_id: 'student-uuid', clinical_settings: 'OR' } },
      }],
      reportData: null,
    });
    render(<EPABox {...defaultProps} />);
    await waitFor(() => expect(screen.getByTestId('line-graph')).toBeInTheDocument());
  });
});
