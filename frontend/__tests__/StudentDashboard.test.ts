import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useUser } from '@/context/UserContext';
import StudentDashboard from '@/components/(StudentComponents)/studentDashboard';

let mockSupabaseFrom: jest.Mock;
let mockSupabaseSelect: jest.Mock;
let mockSupabaseFilter: jest.Mock;

jest.mock('@/context/UserContext');

jest.mock('@/utils/supabase/client', () => {
  mockSupabaseFilter = jest.fn();
  mockSupabaseSelect = jest.fn(() => ({
    filter: mockSupabaseFilter,
  }));
  mockSupabaseFrom = jest.fn(() => ({
    select: mockSupabaseSelect,
  }));

  return {
    createClient: jest.fn(() => ({
      from: mockSupabaseFrom,
    })),
  };
});

describe('StudentDashboard Component (.ts version)', () => {
  const mockUser = { id: '4f08490a-ab81-4d3b-aace-7ba0243057b9' };
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    (useUser as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    mockSupabaseFilter.mockResolvedValue({
      data: [],
      error: null,
    });

    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test('renders loading state when user context is loading', async () => {
    (useUser as jest.Mock).mockReturnValue({
      user: null,
      loading: true,
    });

    render(React.createElement(StudentDashboard));

    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  test('does not fetch data when user is not present', async () => {
    (useUser as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    render(React.createElement(StudentDashboard));

    await waitFor(() => {
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });
  });

  test('handles form_results query error', async () => {
    mockSupabaseFrom.mockImplementation(() => ({
      select: jest.fn(() => ({
        filter: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'form results query error' },
        }),
      })),
    }));

    render(React.createElement(StudentDashboard));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Data Fetch Error:',
        { message: 'form results query error' }
      );
    });
  });

  test('warns when no form_results data is found for student', async () => {
    mockSupabaseFrom.mockImplementation(() => ({
      select: jest.fn(() => ({
        filter: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })),
    }));

    render(React.createElement(StudentDashboard));

    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No valid data found in form_results for this student')
      );
    });
  });

  test('handles form_results that is not an array', async () => {
    mockSupabaseFrom.mockImplementation(() => ({
      select: jest.fn(() => ({
        filter: jest.fn().mockResolvedValue({
          data: {},
          error: null,
        }),
      })),
    }));

    render(React.createElement(StudentDashboard));

    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No valid data found in form_results for this student')
      );
    });
  });

  test('handles ID mismatch in joined data', async () => {
    const entry1 = {
      id: 1,
      created_at: '2023-01-01T00:00:00Z',
      parent_response_id: 'abc123',
      results: { '1.1': 3 },
      form_responses: {
        response_id: 'xyz789',
        request_id: 'req123',
        form_requests: {
          id: 'req123',
          created_at: '2023-01-01T00:00:00Z',
          student_id: mockUser.id,
        },
      },
    };

    mockSupabaseFrom.mockImplementation(() => ({
      select: jest.fn(() => ({
        filter: jest.fn().mockResolvedValue({
          data: [entry1],
          error: null,
        }),
      })),
    }));

    render(React.createElement(StudentDashboard));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('ID mismatch in joined data:'),
        entry1
      );
    });
  });

  test('handles request ID mismatch in joined data', async () => {
    const entry2 = {
      id: 1,
      created_at: '2023-01-01T00:00:00Z',
      parent_response_id: 'abc123',
      results: { '1.1': 3 },
      form_responses: {
        response_id: 'abc123',
        request_id: 'req123',
        form_requests: {
          id: 'req345',
          created_at: '2023-01-01T00:00:00Z',
          student_id: mockUser.id,
        },
      },
    };

    mockSupabaseFrom.mockImplementation(() => ({
      select: jest.fn(() => ({
        filter: jest.fn().mockResolvedValue({
          data: [entry2],
          error: null,
        }),
      })),
    }));

    render(React.createElement(StudentDashboard));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('ID mismatch in joined data:'),
        entry2
      );
    });
  });

  test('handles epa_kf_descriptions query error', async () => {
    const firstEntry = {
      id: 1,
      created_at: '2023-01-01T00:00:00Z',
      parent_response_id: 'abc123',
      results: { '1.1': 3 },
      form_responses: {
        response_id: 'abc123',
        request_id: 'req123',
        form_requests: {
          id: 'req123',
          created_at: '2023-01-01T00:00:00Z',
          student_id: mockUser.id,
        },
      },
    };

    mockSupabaseFrom
      .mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          filter: jest.fn().mockResolvedValue({
            data: [firstEntry],
            error: null,
          }),
        })),
      }))
      .mockImplementationOnce(() => ({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'EPA description fetch error' },
        }),
      }));

    render(React.createElement(StudentDashboard));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'EPA Fetch Error:',
        expect.objectContaining({ message: 'EPA description fetch error' })
      );
    });
  });

  test('warns when epa descriptions are not found', async () => {
    const firstEntry = {
      id: 1,
      created_at: '2023-01-01T00:00:00Z',
      parent_response_id: 'abc123',
      results: { '1.1': 3 },
      form_responses: {
        response_id: 'abc123',
        request_id: 'req123',
        form_requests: {
          id: 'req123',
          created_at: '2023-01-01T00:00:00Z',
          student_id: mockUser.id,
        },
      },
    };

    mockSupabaseFrom
      .mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          filter: jest.fn().mockResolvedValue({
            data: [firstEntry],
            error: null,
          }),
        })),
      }))
      .mockImplementationOnce(() => ({
        select: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }));

    render(React.createElement(StudentDashboard));

    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith('EPA descriptions not found');
    });
  });
});