/** @jest-environment jsdom */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockRpc = jest.fn();
const mockFrom = jest.fn();
const mockGetUser = jest.fn();
const mockUseRequireRole = jest.fn();
const mockSendEmail = jest.fn();

let formInsertResult: { data: { id: string } | null; error: { message: string } | null };
let capturedInsertPayload: unknown;

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}));

jest.mock('@/context/UserContext', () => ({}));

jest.mock('react-select', () => ({
  __esModule: true,
  default: ({ options, value, onChange, placeholder, isDisabled, styles }: any) => {
    styles?.control?.({}, {});
    styles?.menu?.({}, {});
    styles?.menuPortal?.({}, {});
    styles?.option?.({}, { isFocused: true, isSelected: false });
    styles?.singleValue?.({}, {});
    styles?.input?.({}, {});
    styles?.placeholder?.({}, {});
    styles?.indicatorSeparator?.({}, {});
    styles?.dropdownIndicator?.({}, {});

    return (
      <select
        data-testid='react-select'
        value={value?.value ?? ''}
        disabled={isDisabled}
        onChange={(e) => {
          const selected = options.find((option: any) => option.value === e.target.value) ?? null;
          onChange(selected);
        }}
      >
        <option value=''>{placeholder}</option>
        {options.map((option: any) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  },
}));

jest.mock('@/utils/useRequiredRole', () => ({
  useRequireRole: (...args: unknown[]) => mockUseRequireRole(...args),
}));

jest.mock('@/app/dashboard/student/form-requests/email-api/send-email.server', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

import FormRequests from '@/app/dashboard/student/form-requests/page';

describe('student form-requests page coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    formInsertResult = { data: { id: 'req-1' }, error: null };
    capturedInsertPayload = null;

    mockUseRequireRole.mockReturnValue(undefined);
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'stu-1' } },
      error: null,
    });
    mockSendEmail.mockResolvedValue({ success: true });

    mockRpc.mockResolvedValue({
      data: [
        { id: 'fac-1', email: 'faculty.one@example.com', role: 'rater' },
        { id: 'fac-2', email: 'faculty.two@example.com', role: 'rater' },
        { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
      ],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn((columns: string) => {
            if (columns === 'id, display_name, account_status') {
              return Promise.resolve({
                data: [
                  { id: 'fac-1', display_name: 'Faculty One', account_status: 'Active' },
                  { id: 'fac-2', display_name: 'Faculty Two', account_status: 'Inactive' },
                ],
                error: null,
              });
            }

            if (columns === 'display_name') {
              return {
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { display_name: 'Student One' },
                    error: null,
                  }),
                })),
              };
            }

            return Promise.resolve({ data: [], error: null });
          }),
        };
      }

      if (table === 'clinical_settings') {
        return {
          select: jest.fn().mockResolvedValue({
            data: [{ setting: 'Emergency Department' }, { setting: 'Clinic' }],
            error: null,
          }),
        };
      }

      if (table === 'form_requests') {
        return {
          insert: jest.fn((payload: unknown) => {
            capturedInsertPayload = payload;
            return {
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue(formInsertResult),
              })),
            };
          }),
        };
      }

      return {
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function selectRequiredFields() {
    await waitFor(() => {
      expect(screen.getAllByTestId('react-select').length).toBe(2);
    });

    const selects = screen.getAllByTestId('react-select');
    fireEvent.change(selects[0], { target: { value: 'fac-1' } });
    fireEvent.change(selects[1], { target: { value: 'Emergency Department' } });

    fireEvent.change(screen.getByLabelText('Relevant Activity *'), {
      target: { value: 'Observed focused history and clear plan.' },
    });

    fireEvent.change(screen.getByLabelText('Stated Goals (optional)'), {
      target: { value: 'Improve differential diagnosis.' },
    });
  }

  it('renders form and enforces role guard', async () => {
    render(<FormRequests />);

    expect(mockUseRequireRole).toHaveBeenCalledWith(['student', 'dev']);
    await waitFor(() => {
      expect(screen.getByText('Request Assessment')).toBeInTheDocument();
    });
  });

  it('shows validation error when required fields are missing', async () => {
    render(<FormRequests />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Submit Request' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit Request' }));
    expect(screen.getByText('Please fill in all required fields.')).toBeInTheDocument();
  });

  it('shows error when student details cannot be determined', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'User not found' },
    });

    render(<FormRequests />);
    await selectRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: 'Submit Request' }));

    await waitFor(() => {
      expect(screen.getByText('Unable to determine student details.')).toBeInTheDocument();
    });
  });

  it('submits request and sends email successfully', async () => {
    render(<FormRequests />);

    await selectRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: 'Submit Request' }));

    await waitFor(() => {
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'faculty.one@example.com',
        studentName: 'Student One',
        requestId: 'req-1',
      });
    });

    expect(capturedInsertPayload).toEqual([
      {
        student_id: 'stu-1',
        completed_by: 'fac-1',
        clinical_settings: 'Emergency Department',
        goals: 'Improve differential diagnosis.',
        notes: 'Observed focused history and clear plan.',
      },
    ]);

    expect(screen.getByText('Request sent successfully!')).toBeInTheDocument();
    expect(screen.getByLabelText('Relevant Activity *')).toHaveValue('');
    expect(screen.getByLabelText('Stated Goals (optional)')).toHaveValue('');
  });

  it('handles insert failure', async () => {
    formInsertResult = { data: null, error: { message: 'insert failed' } };

    render(<FormRequests />);
    await selectRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: 'Submit Request' }));

    await waitFor(() => {
      expect(screen.getByText('Error submitting the form. Please try again.')).toBeInTheDocument();
    });
  });

  it('handles email delivery failure after successful insert', async () => {
    mockSendEmail.mockRejectedValueOnce(new Error('mail fail'));

    render(<FormRequests />);

    await selectRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Submit Request' }));

    await waitFor(() => {
      expect(screen.getByText('Error sending the email.')).toBeInTheDocument();
    });
  });

  it('handles faculty/settings fetch errors without crashing', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'rpc failure' } });
    mockFrom.mockImplementationOnce(() => ({
      select: jest.fn().mockResolvedValue({ data: null, error: { message: 'settings fail' } }),
    }));

    render(<FormRequests />);

    await waitFor(() => {
      expect(screen.getByText('Request Assessment')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Submit Request' })).toBeInTheDocument();
    });
  });

  it('handles unexpected fetchFaculty exceptions', async () => {
    mockRpc.mockRejectedValueOnce(new Error('network down'));

    render(<FormRequests />);

    await waitFor(() => {
      expect(screen.getByText('Request Assessment')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Submit Request' })).toBeInTheDocument();
    });
  });

  it('handles non-Error exceptions in fetchFaculty catch', async () => {
    mockRpc.mockRejectedValueOnce('string failure');

    render(<FormRequests />);

    await waitFor(() => {
      expect(screen.getByText('Request Assessment')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Submit Request' })).toBeInTheDocument();
    });
  });

  it('handles profile fetch failure for current user', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn((columns: string) => {
            if (columns === 'id, display_name, account_status') {
              return Promise.resolve({
                data: [{ id: 'fac-1', display_name: 'Faculty One', account_status: 'Active' }],
                error: null,
              });
            }
            return {
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({ data: null, error: { message: 'profile fail' } }),
              })),
            };
          }),
        };
      }

      if (table === 'clinical_settings') {
        return {
          select: jest.fn().mockResolvedValue({ data: [{ setting: 'Clinic' }], error: null }),
        };
      }

      if (table === 'form_requests') {
        return {
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue(formInsertResult),
            })),
          })),
        };
      }

      return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    render(<FormRequests />);

    await waitFor(() => {
      expect(screen.getByText('Request Assessment')).toBeInTheDocument();
    });
  });

  it('handles current user lookup failure branch', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'lookup failed' },
    });

    render(<FormRequests />);

    await waitFor(() => {
      expect(screen.getByText('Request Assessment')).toBeInTheDocument();
    });
  });

  it('handles non-Error sendEmail rejection', async () => {
    mockSendEmail.mockRejectedValueOnce('mail failed badly');

    render(<FormRequests />);
    await selectRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Submit Request' }));

    await waitFor(() => {
      expect(screen.getByText('Error sending the email.')).toBeInTheDocument();
    });
  });
});
