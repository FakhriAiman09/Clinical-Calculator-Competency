import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: { getUser: jest.fn() },
  })),
}));

jest.mock('@/utils/useRequiredRole', () => ({
  useRequireRole: jest.fn(),
}));

jest.mock('@/utils/get-epa-data', () => ({
  getEPAKFDescs: jest.fn().mockResolvedValue({
    kf_desc: [
      { epa: 1, kf: 'KF one' },
      { epa: 2, kf: 'KF two' },
    ],
  }),
}));

jest.mock('@/utils/epa-scoring', () => ({
  REPORT_TIME_WINDOWS: [3, 6, 12],
  formatReportTimeWindowLabel: jest.fn((v: string | number) => `${v} months`),
  getReportTimeWindowMonths: jest.fn((v: string | number) => {
    const n = Number.parseInt(String(v), 10);
    return Number.isFinite(n) ? n : 3;
  }),
}));

jest.mock('@/utils/comment-quality', () => ({
  analyzeCommentsQuality: jest.fn((list: string[]) => {
    const flagged = list
      .filter((t) => t.toLowerCase().includes('bad'))
      .map((text) => ({ text, reasons: ['too_short'] }));
    return {
      flagged,
      total: list.length,
      reasonCounts: {
        too_short: flagged.length,
        generic: 0,
        non_specific: 0,
        non_actionable: 0,
      },
    };
  }),
  detectFaultReasons: jest.fn((text: string) => (text.toLowerCase().includes('bad') ? ['too_short'] : [])),
  reasonLabel: jest.fn((reason: string) => (reason === 'too_short' ? 'Comment too short' : reason)),
}));

jest.mock('@/utils/report-response', () => ({
  groupKfDescriptions: jest.fn(() => ({
    '1': ['KF one label'],
    '2': ['KF two label'],
  })),
  extractCommentTextsForEpa: jest.fn(() => ['bad comment example']),
  collectCommentsPerEpa: jest.fn(() => ({
    1: ['bad comment example'],
    2: ['good detailed comment'],
    3: [],
    4: [],
    5: [],
    6: [],
    7: [],
    8: [],
    9: [],
    10: [],
    11: [],
    12: [],
    13: [],
  })),
}));

jest.mock('@/components/(StudentComponents)/PrintPDFButton', () => ({
  __esModule: true,
  default: ({ reportId }: { reportId: string }) => <button>Download PDF {reportId}</button>,
}));

jest.mock('./../src/app/dashboard/admin/all-reports/admin-email-api/send-email-admin.server', () => ({
  sendResubmissionEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const MockEPABox = ({ epaId, onCommentDeleted }: { epaId: number; onCommentDeleted?: () => void }) => (
      <div data-testid={`epabox-${epaId}`}>
        EPABox {epaId}
        <button onClick={() => onCommentDeleted?.()} aria-label={`delete-${epaId}`}>
          Trigger Delete
        </button>
      </div>
    );
    return MockEPABox;
  },
}));

import { sendResubmissionEmail } from '@/app/dashboard/admin/all-reports/admin-email-api/send-email-admin.server';
import { extractCommentTextsForEpa } from '@/utils/report-response';
import AdminAllReportsPage from '@/app/dashboard/admin/all-reports/page';

interface MockData {
  userRoles: Array<{ user_id: string }>;
  profiles: Array<{ id: string; display_name: string | null }>;
  reports: Array<{
    id: string;
    user_id: string;
    title: string;
    time_window: string;
    report_data: Record<string, number>;
    llm_feedback: string | null;
    created_at: string;
  }>;
  formRequests: Array<{ id: string }>;
  formResponses: Array<{ response_id: string }>;
  formResults: Array<{ response_id: string; created_at: string; results: Record<string, number> }>;
  formResultsWithComments: unknown[];
  users: Array<{ user_id: string; display_name?: string; email?: string }>;
}

interface SetupOptions {
  commentsQueryError?: boolean;
  formResponseLookupMissing?: boolean;
  formResponseLookupMissingOnEmailOnly?: boolean;
  formResponseLookupError?: boolean;
  formRequestLookupError?: boolean;
  reopenRequestError?: boolean;
  usersRpcError?: boolean;
  throwOnRequestLookup?: boolean;
}

function setupSupabase(data: MockData, options: SetupOptions = {}) {
  const updateFormResultsEq = jest.fn().mockResolvedValue({ error: null });
  const updateStudentReportsEq = jest.fn().mockResolvedValue({ error: null });
  const updateFormRequestsEq = jest.fn().mockResolvedValue({ error: null });
  let requestIdLookupCalls = 0;

  mockRpc.mockImplementation((fnName: string) => {
    if (fnName === 'fetch_users') {
      if (options.usersRpcError) {
        return Promise.resolve({ data: null, error: { message: 'users rpc failed' } });
      }
      return Promise.resolve({ data: data.users, error: null });
    }
    if (fnName === 'generate_report') {
      return Promise.resolve({ data: null, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });

  mockFrom.mockImplementation((table: string) => {
    if (table === 'user_roles') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: data.userRoles, error: null })),
        })),
      };
    }

    if (table === 'profiles') {
      return {
        select: jest.fn(() => ({
          in: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ data: data.profiles, error: null })),
          })),
        })),
      };
    }

    if (table === 'student_reports') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ data: data.reports, error: null })),
            single: jest.fn(() => Promise.resolve({ data: data.reports[0] ?? null, error: null })),
          })),
        })),
        update: jest.fn(() => ({
          eq: updateStudentReportsEq,
        })),
      };
    }

    if (table === 'form_requests') {
      return {
        select: jest.fn((columns: string) => ({
          eq: jest.fn((field: string) => {
            if (columns.includes('completed_by') && field === 'id') {
              return {
                single: jest.fn(() =>
                  Promise.resolve({
                    data: options.formRequestLookupError ? null : { id: 'req-1', completed_by: 'rater-1', student_id: 'stu-1' },
                    error: options.formRequestLookupError ? { message: 'request lookup failed' } : null,
                  })
                ),
              };
            }
            return Promise.resolve({ data: data.formRequests, error: null });
          }),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: options.reopenRequestError ? { message: 'reopen failed' } : null })),
        })),
      };
    }

    if (table === 'form_responses') {
      return {
        select: jest.fn((columns: string) => {
          if (columns === 'response_id') {
            return {
              in: jest.fn(() => Promise.resolve({ data: data.formResponses, error: null })),
            };
          }
          if (columns === 'request_id') {
            return {
              eq: jest.fn(() => ({
                single: jest.fn(() => {
                  if (options.throwOnRequestLookup) {
                    return Promise.reject(new Error('request lookup exception'));
                  }
                  const shouldMissing =
                    options.formResponseLookupMissing ||
                    (options.formResponseLookupMissingOnEmailOnly && requestIdLookupCalls > 0);
                  requestIdLookupCalls += 1;
                  return Promise.resolve({
                    data: shouldMissing ? null : { request_id: 'req-1' },
                    error: options.formResponseLookupError ? { message: 'form response lookup failed' } : null,
                  });
                }),
              })),
            };
          }
          return {
            eq: jest.fn(() => ({ single: jest.fn(() => Promise.resolve({ data: null, error: null })) })),
          };
        }),
      };
    }

    if (table === 'form_results') {
      return {
        select: jest.fn(() => {
          const afterIn = {
            returns: jest.fn(() => Promise.resolve({
              data: options.commentsQueryError ? null : data.formResultsWithComments,
              error: options.commentsQueryError ? { message: 'result query failed' } : null,
            })),
            then: (resolve: (value: { data: MockData['formResults']; error: null }) => void) =>
              Promise.resolve({ data: data.formResults, error: null }).then(resolve),
          };
          return {
            in: jest.fn(() => afterIn),
            returns: jest.fn(() => Promise.resolve({
              data: options.commentsQueryError ? null : data.formResultsWithComments,
              error: options.commentsQueryError ? { message: 'result query failed' } : null,
            })),
          };
        }),
        update: jest.fn(() => ({
          eq: updateFormResultsEq,
        })),
      };
    }

    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    };
  });

  return {
    updateFormResultsEq,
    updateStudentReportsEq,
    updateFormRequestsEq,
  };
}

const nowIso = '2026-04-10T10:00:00.000Z';

function buildMockData(overrides: Partial<MockData> = {}): MockData {
  return {
    userRoles: [{ user_id: 'stu-1' }],
    profiles: [{ id: 'stu-1', display_name: 'Student One' }],
    reports: [
      {
        id: 'rep-1',
        user_id: 'stu-1',
        title: 'Quarterly Report (3m)',
        time_window: '3m',
        report_data: { '1.1': 2 },
        llm_feedback: null,
        created_at: nowIso,
      },
      {
        id: 'rep-old',
        user_id: 'stu-1',
        title: 'Very Old Report',
        time_window: '3m',
        report_data: { '1.1': 1 },
        llm_feedback: null,
        created_at: '2024-01-01T00:00:00.000Z',
      },
    ],
    formRequests: [{ id: 'req-1' }],
    formResponses: [{ response_id: 'resp-1' }],
    formResults: [{ response_id: 'resp-1', created_at: '2026-04-01T10:00:00.000Z', results: { '1.1': 1, '1.2': 2 } }],
    formResultsWithComments: [
      {
        response_id: 'resp-1',
        created_at: '2026-04-01T10:00:00.000Z',
        results: { '1.1': 1, '1.2': 2 },
        form_responses: {
          response: { response: { '1': { kf1: { text: ['bad comment example'] } } } },
          form_requests: { student_id: 'stu-1', clinical_settings: 'Clinic' },
        },
      },
    ],
    users: [{ user_id: 'rater-1', display_name: 'Rater One', email: 'rater@example.com' }],
    ...overrides,
  };
}

describe('Admin all-reports page coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  function pickStudent(studentId: string) {
    const studentSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(studentSelect, { target: { value: studentId } });
  }

  async function pickFirstFormResultRow() {
    const modal = screen.getByText(/Select a Form Result for EPA/i).closest('.modal-content');
    if (!modal) throw new Error('Modal not found');
    await waitFor(() => {
      const optionButtons = within(modal).getAllByRole('button').filter((b) => b.className.includes('text-start'));
      expect(optionButtons.length).toBeGreaterThan(0);
    });
    const formButtons = within(modal).getAllByRole('button').filter((b) => b.className.includes('text-start'));
    fireEvent.click(formButtons[0]);
  }

  async function openReportAndEditEPA1() {
    await waitFor(() => expect(screen.getByText('Student One')).toBeInTheDocument());
    pickStudent('stu-1');
    await waitFor(() => expect(screen.getByText(/Quarterly Report/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Quarterly Report/));
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    await waitFor(() => expect(screen.getByText('Edit EPA 1')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Edit EPA 1'));
    await waitFor(() => expect(screen.getByText(/Select a Form Result for EPA 1/i)).toBeInTheDocument());
  }

  it('loads students and allows generating reports for selected student', async () => {
    setupSupabase(buildMockData());
    render(<AdminAllReportsPage />);

    await waitFor(() => {
      expect(screen.getByText('Student Report Generation')).toBeInTheDocument();
      expect(screen.getByText('Student One')).toBeInTheDocument();
    });

    pickStudent('stu-1');
    await waitFor(() => {
      expect(screen.getByText(/Past Reports for Student One/i)).toBeInTheDocument();
    });

    const titleInput = screen.getAllByRole('textbox')[0];
    fireEvent.change(titleInput, { target: { value: ' Custom Admin Report ' } });
    fireEvent.click(screen.getByText('Generate Report'));
    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('generate_report', expect.objectContaining({
        student_id_input: 'stu-1',
        report_title: 'Custom Admin Report',
      }));
    });

    const reportWindowGroup = screen.getByRole('group', { name: 'Report time window' });
    fireEvent.click(within(reportWindowGroup).getByRole('button', { name: 'Last 6 mo' }));
    fireEvent.click(screen.getByText('Generate Report'));
    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('generate_report', expect.objectContaining({ time_range_input: 6 }));
    });
  });

  it('filters report list by search and time window', async () => {
    setupSupabase(buildMockData());
    render(<AdminAllReportsPage />);

    await waitFor(() => expect(screen.getByText('Student One')).toBeInTheDocument());
    pickStudent('stu-1');
    await waitFor(() => expect(screen.getByText(/Past Reports for Student One/i)).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText('Search reports by name');
    fireEvent.change(searchInput, { target: { value: 'Quarterly' } });
    expect(screen.getByText(/Quarterly Report/i)).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'No Match' } });
    expect(screen.queryByText(/Quarterly Report/i)).toBeNull();

    fireEvent.change(searchInput, { target: { value: '' } });
    const filterGroup = screen.getByRole('group', { name: 'Time range filter' });
    fireEvent.click(within(filterGroup).getByRole('button', { name: 'Last 12 mo' }));
    expect(screen.getByText(/Quarterly Report/i)).toBeInTheDocument();
  });

  it('selects a report, runs checks, and renders flagged summary', async () => {
    setupSupabase(buildMockData());
    render(<AdminAllReportsPage />);

    await waitFor(() => expect(screen.getByText('Student One')).toBeInTheDocument());
    pickStudent('stu-1');
    await waitFor(() => expect(screen.getByText(/Quarterly Report/i)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Quarterly Report/));
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    await waitFor(() => {
      expect(screen.getByText('Download PDF rep-1')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Run Checks' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Run Checks' }));

    await waitFor(() => {
      expect(screen.getByText(/Issues found/i)).toBeInTheDocument();
      expect(screen.getByText(/Top issue:/i)).toBeInTheDocument();
    });
  });

  it('opens edit modal, updates development level, and saves changes', async () => {
    const updates = setupSupabase(buildMockData());
    render(<AdminAllReportsPage />);

    await waitFor(() => expect(screen.getByText('Student One')).toBeInTheDocument());
    pickStudent('stu-1');
    await waitFor(() => expect(screen.getByText(/Quarterly Report/i)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Quarterly Report/));
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    await waitFor(() => expect(screen.getByText('Edit EPA 1')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Edit EPA 1'));

    await waitFor(() => expect(screen.getByText(/Select a Form Result for EPA 1/i)).toBeInTheDocument());
    await pickFirstFormResultRow();

    await waitFor(() => expect(screen.getByText('Edit Development Levels')).toBeInTheDocument());
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[selects.length - 1], { target: { value: '3' } });

    fireEvent.click(screen.getByText('Save Changes'));
    await waitFor(() => {
      expect(updates.updateFormResultsEq).toHaveBeenCalledWith('response_id', 'resp-1');
    });
  });

  it('shows flagged comment action and sends resubmission email', async () => {
    setupSupabase(buildMockData());
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<AdminAllReportsPage />);

    await waitFor(() => expect(screen.getByText('Student One')).toBeInTheDocument());
    pickStudent('stu-1');
    await waitFor(() => expect(screen.getByText(/Quarterly Report/i)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Quarterly Report/));
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    fireEvent.click(screen.getByText('Edit EPA 1'));
    await waitFor(() => expect(screen.getByText(/Select a Form Result for EPA 1/i)).toBeInTheDocument());
    await pickFirstFormResultRow();

    await waitFor(() => {
      expect(screen.getByText(/Action Required: Flagged Content Detected/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Request Resubmission from Rater/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /Request Resubmission from Rater/i }));

    await waitFor(() => {
      expect(sendResubmissionEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'rater@example.com',
          studentName: 'Student One',
          responseId: 'resp-1',
        })
      );
      expect(screen.getByText(/Resubmission request email sent successfully/i)).toBeInTheDocument();
    });
  });

  it('recalculates report after comment deletion trigger', async () => {
    const updates = setupSupabase(buildMockData());
    render(<AdminAllReportsPage />);

    await waitFor(() => expect(screen.getByText('Student One')).toBeInTheDocument());
    pickStudent('stu-1');
    await waitFor(() => expect(screen.getByText(/Quarterly Report/i)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Quarterly Report/));
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    await waitFor(() => expect(screen.getByTestId('epabox-1')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('delete-1'));

    await waitFor(() => {
      expect(screen.getByText(/Comment deleted/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Recalculate Scores & Feedback/i }));

    await waitFor(() => {
      expect(updates.updateStudentReportsEq).toHaveBeenCalledWith('id', 'rep-1');
    });
  });

  it('does not generate report when no student is selected', async () => {
    setupSupabase(buildMockData());
    render(<AdminAllReportsPage />);

    await waitFor(() => expect(screen.getByText('Student Report Generation')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Generate Report'));

    expect(mockRpc).not.toHaveBeenCalledWith('generate_report', expect.anything());
  });

  it('shows email error when rater email is missing', async () => {
    setupSupabase(buildMockData({ users: [{ user_id: 'rater-1', display_name: 'Rater One', email: undefined }] }));
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<AdminAllReportsPage />);

    await waitFor(() => expect(screen.getByText('Student One')).toBeInTheDocument());
    pickStudent('stu-1');
    await waitFor(() => expect(screen.getByText(/Quarterly Report/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Quarterly Report/));
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    fireEvent.click(screen.getByText('Edit EPA 1'));
    await waitFor(() => expect(screen.getByText(/Select a Form Result for EPA 1/i)).toBeInTheDocument());
    await pickFirstFormResultRow();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Request Resubmission from Rater/i })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText(/Email will be sent to:/i)).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /Request Resubmission from Rater/i }));
    await waitFor(() => {
      expect(screen.getByText(/Rater email not found/i)).toBeInTheDocument();
    });
  });

  it('sorts flagged forms before unflagged forms in modal list', async () => {
    const defaultExtractImpl = () => ['bad comment example'];
    (extractCommentTextsForEpa as jest.Mock).mockImplementation((formResponse: any) => {
      const text = formResponse?.response?.response?.['1']?.kf1?.text ?? [];
      return Array.isArray(text) ? text : [];
    });

    setupSupabase(buildMockData({
      formResponses: [{ response_id: 'resp-flag' }, { response_id: 'resp-ok' }],
      formResults: [
        { response_id: 'resp-ok', created_at: '2026-04-01T10:00:00.000Z', results: { '1.1': 2 } },
        { response_id: 'resp-flag', created_at: '2026-03-01T10:00:00.000Z', results: { '1.1': 1 } },
      ],
      formResultsWithComments: [
        {
          response_id: 'resp-ok',
          created_at: '2026-04-01T10:00:00.000Z',
          results: { '1.1': 2 },
          form_responses: {
            response: { response: { '1': { kf1: { text: ['good detailed comment'] } } } },
            form_requests: { student_id: 'stu-1', clinical_settings: 'Clinic' },
          },
        },
        {
          response_id: 'resp-flag',
          created_at: '2026-03-01T10:00:00.000Z',
          results: { '1.1': 1 },
          form_responses: {
            response: { response: { '1': { kf1: { text: ['bad short'] } } } },
            form_requests: { student_id: 'stu-1', clinical_settings: 'Clinic' },
          },
        },
      ],
    }));

    render(<AdminAllReportsPage />);
    await openReportAndEditEPA1();

    const modal = screen.getByText(/Select a Form Result for EPA 1/i).closest('.modal-content') as HTMLElement;
    await waitFor(() => {
      const items = within(modal).queryAllByRole('button').filter((b) => b.className.includes('text-start'));
      expect(items.length).toBeGreaterThan(0);
    });
    const rows = within(modal).getAllByRole('button').filter((b) => b.className.includes('text-start'));
    expect(rows[0]).toHaveTextContent(/flagged/i);

    (extractCommentTextsForEpa as jest.Mock).mockImplementation(defaultExtractImpl);
  });

  it('handles comment query errors without crashing', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    setupSupabase(buildMockData(), { commentsQueryError: true });
    render(<AdminAllReportsPage />);

    await waitFor(() => expect(screen.getByText('Student One')).toBeInTheDocument());
    pickStudent('stu-1');
    await waitFor(() => expect(screen.getByText(/Quarterly Report/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Quarterly Report/));
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    fireEvent.click(screen.getByText('Edit EPA 1'));
    await waitFor(() => expect(screen.getByText(/Select a Form Result for EPA 1/i)).toBeInTheDocument());
    await pickFirstFormResultRow();

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it('handles fetchFormResults early return when no form requests exist', async () => {
    setupSupabase(buildMockData({ formRequests: [] }));
    render(<AdminAllReportsPage />);

    await openReportAndEditEPA1();
    expect(screen.queryByText('Edit Development Levels')).toBeNull();
  });

  it('handles fetchFormResults early return when no form responses exist', async () => {
    setupSupabase(buildMockData({ formResponses: [] }));
    render(<AdminAllReportsPage />);

    await openReportAndEditEPA1();
    expect(screen.queryByText('Edit Development Levels')).toBeNull();
  });

  it('sets last run time when checks run with no request ids', async () => {
    setupSupabase(buildMockData({ formRequests: [] }));
    render(<AdminAllReportsPage />);

    await waitFor(() => expect(screen.getByText('Student One')).toBeInTheDocument());
    pickStudent('stu-1');
    await waitFor(() => expect(screen.getByText(/Quarterly Report/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Quarterly Report/));
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Run Checks' }));
    await waitFor(() => {
      expect(screen.getByText(/Last run:/i)).toBeInTheDocument();
    });
  });

  it('sets last run time when checks run with no response ids', async () => {
    setupSupabase(buildMockData({ formResponses: [] }));
    render(<AdminAllReportsPage />);

    await waitFor(() => expect(screen.getByText('Student One')).toBeInTheDocument());
    pickStudent('stu-1');
    await waitFor(() => expect(screen.getByText(/Quarterly Report/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Quarterly Report/));
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Run Checks' }));
    await waitFor(() => {
      expect(screen.getByText(/Last run:/i)).toBeInTheDocument();
    });
  });

  it('handles run checks query errors without crashing', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    setupSupabase(buildMockData(), { commentsQueryError: true });
    render(<AdminAllReportsPage />);

    await waitFor(() => expect(screen.getByText('Student One')).toBeInTheDocument());
    pickStudent('stu-1');
    await waitFor(() => expect(screen.getByText(/Quarterly Report/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Quarterly Report/));
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Run Checks' }));
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });

  it('handles form request data lookup error paths', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    setupSupabase(buildMockData(), { formResponseLookupError: true });
    render(<AdminAllReportsPage />);

    await openReportAndEditEPA1();
    await pickFirstFormResultRow();
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });

  it('handles fetch users rpc error path', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    setupSupabase(buildMockData(), { usersRpcError: true });
    render(<AdminAllReportsPage />);

    await openReportAndEditEPA1();
    await pickFirstFormResultRow();
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });

  it('handles fetch form request lookup error path', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    setupSupabase(buildMockData(), { formRequestLookupError: true });
    render(<AdminAllReportsPage />);

    await openReportAndEditEPA1();
    await pickFirstFormResultRow();
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });

  it('handles fetch form request data exception path', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    setupSupabase(buildMockData(), { throwOnRequestLookup: true });
    render(<AdminAllReportsPage />);

    await openReportAndEditEPA1();
    await pickFirstFormResultRow();
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });

  it('shows form request not found error when email flow lookup fails', async () => {
    setupSupabase(buildMockData(), { formResponseLookupMissingOnEmailOnly: true });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<AdminAllReportsPage />);

    await openReportAndEditEPA1();
    await pickFirstFormResultRow();
    await waitFor(() => expect(screen.getByText(/Action Required: Flagged Content Detected/i)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Request Resubmission from Rater/i }));

    await waitFor(() => {
      expect(screen.getByText(/Form request not found/i)).toBeInTheDocument();
    });
  });

  it('shows reopen request failure error when update fails', async () => {
    setupSupabase(buildMockData(), { reopenRequestError: true });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<AdminAllReportsPage />);

    await openReportAndEditEPA1();
    await pickFirstFormResultRow();
    await waitFor(() => expect(screen.getByText(/Action Required: Flagged Content Detected/i)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Request Resubmission from Rater/i }));

    await waitFor(() => {
      expect(screen.getByText(/Failed to reopen form request/i)).toBeInTheDocument();
    });
  });

  it('handles sendResubmissionEmail exception branch', async () => {
    (sendResubmissionEmail as jest.Mock).mockRejectedValueOnce(new Error('mail failed'));
    setupSupabase(buildMockData());
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<AdminAllReportsPage />);

    await openReportAndEditEPA1();
    await pickFirstFormResultRow();
    await waitFor(() => expect(screen.getByText(/Action Required: Flagged Content Detected/i)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Request Resubmission from Rater/i }));

    await waitFor(() => {
      expect(screen.getByText(/mail failed/i)).toBeInTheDocument();
    });
  });

  it('closes modal from both close icon and cancel button', async () => {
    setupSupabase(buildMockData());
    render(<AdminAllReportsPage />);

    await openReportAndEditEPA1();
    const closeBtn = document.querySelector('.btn-close') as HTMLButtonElement;
    fireEvent.click(closeBtn);
    await waitFor(() => {
      expect(screen.queryByText(/Select a Form Result for EPA 1/i)).toBeNull();
    });

    fireEvent.click(screen.getByText('Edit EPA 1'));
    await waitFor(() => expect(screen.getByText(/Select a Form Result for EPA 1/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText(/Select a Form Result for EPA 1/i)).toBeNull();
    });
  });
});
