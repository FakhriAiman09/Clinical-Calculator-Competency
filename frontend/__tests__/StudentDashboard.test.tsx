import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useUser } from '@/context/UserContext';

// Mock Supabase client
const mockSupabaseFrom = jest.fn();
const mockSupabaseSelect = jest.fn();
const mockSupabaseFilter = jest.fn();

jest.mock('@/context/UserContext');

jest.doMock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: mockSupabaseFrom.mockImplementation(() => ({
      select: mockSupabaseSelect.mockImplementation(() => ({
        filter: mockSupabaseFilter.mockResolvedValue({
          data: [],
          error: null,
        })
      }))
    }))
  }))
}));

import StudentDashboard from '@/components/(StudentComponents)/studentDashboard';
describe('StudentDashboard Component', () => {
  const mockUser = { id: '4f08490a-ab81-4d3b-aace-7ba0243057b9' };
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    
    // useUser mockup for user context
    (useUser as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false
    });

    // Console spies
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.resetAllMocks();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test('renders loading state when user context is loading', async () => {
    (useUser as jest.Mock).mockReturnValue({
      user: null,
      loading: true
    });
    render(<StudentDashboard />);
    // Checks if loading state is displayed om screen.
    await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  test('does not fetch data when user is not present', async () => {
    (useUser as jest.Mock).mockReturnValue({
      user: null,
      loading: false
    });

    // Checks if supabase.from() is not called. This would conclude that
    // the compoennt returned early.
    render(<StudentDashboard />);
    await waitFor(() => {
        expect(mockSupabaseFrom).not.toHaveBeenCalled();
    })
  });

  test('handles form_results query error', async () => {
    (useUser as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false
    });
    mockSupabaseFrom.mockImplementation(() => ({
      select: jest.fn().mockImplementation(() => ({
        filter: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'form results query error' }, // Simulate error
        }),
      })),
    }));
    render(<StudentDashboard />);
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Data Fetch Error:',
        { message: 'form results query error' }
      );
    });
  });

  test('warns when no form_results data is found for student', async () => {
    mockSupabaseFrom.mockImplementation(() => ({
      select: jest.fn().mockImplementation(() => ({
        filter: jest.fn().mockResolvedValue({
          data: null, // no data found
          error: null, // no error occured
        }),
      })),
    }));
    render(<StudentDashboard />);
    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No valid data found in form_results for this student')
      );
    });
  });

  test('handles form_results that is not an array', async () => {
    mockSupabaseFrom.mockImplementation(() => ({
      select: jest.fn().mockImplementation(() => ({
        filter: jest.fn().mockResolvedValue({
          data: {}, // in object form, not an array
          error: null,
        }),
      })),
    }));
    
    render(<StudentDashboard />);
    
    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No valid data found in form_results for this student')
      );
    });
  });

  test('handles ID mismatch in joined data', async () => {
    let entry = {
      id: 1,
      created_at: '2023-01-01T00:00:00Z',
      parent_response_id: 'abc123', // Correct parent ID
      results: { '1.1': 3 },
      form_responses: {
        response_id: 'xyz789', // Mismatched parent ID
        request_id: 'req123', // Correct request ID
        form_requests: {
          id: 'req123', // Correct request ID
          created_at: '2023-01-01T00:00:00Z',
          student_id: mockUser.id,
        },
      },
    };
    mockSupabaseFrom.mockImplementation(() => ({
      select: jest.fn().mockImplementation(() => ({
        filter: jest.fn().mockResolvedValue({
          data: [entry],
          error: null,
        }),
      })),
    }));
    render(<StudentDashboard />);
    // Check that it catches incorrect parent ID
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('ID mismatch in joined data:'),
        entry
      );
    });

    entry = {
      id: 1,
      created_at: '2023-01-01T00:00:00Z',
      parent_response_id: 'abc123', // Correct parent ID
      results: { '1.1': 3 },
      form_responses: {
        response_id: 'abc123', // Correct parent ID
        request_id: 'req123', // Correct request ID
        form_requests: {
          id: 'req345', // Incorrect request ID
          created_at: '2023-01-01T00:00:00Z',
          student_id: mockUser.id,
        },
      },
    };
    render(<StudentDashboard />);
    // Check that it catches incorrect request ID
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('ID mismatch in joined data:'),
        entry
      );
    });
  });

  test('handles epa_kf_descriptions query error', async () => {
    // First call to supabase.from().select().filter()
    mockSupabaseFilter.mockResolvedValueOnce({
      data: [{
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
      }],
      error: null
    });

    // Second supabase call for epa_kf_descriptions
    const mockSecondSelect = jest.fn();
    
    mockSupabaseFrom.mockImplementationOnce(() => ({
      select: mockSupabaseSelect.mockImplementationOnce(() => ({
        filter: mockSupabaseFilter
      }))
    })).mockImplementationOnce(() => ({
      select: mockSecondSelect.mockResolvedValueOnce({
        data: null,
        error: { message: 'EPA description fetch error' } // Simulate error
      })
    }));
    
    render(<StudentDashboard />);
    
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'EPA Fetch Error:',
        expect.objectContaining({ message: 'EPA description fetch error' })
      );
    });
  });

  test('warns when epa descriptions are not found', async () => {
    // First call to supabase.from().select().filter()
    mockSupabaseFilter.mockResolvedValueOnce({
      data: [{
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
      }],
      error: null
    });

    // Second call returns empty array (no EPA descriptions)
    mockSupabaseFrom.mockImplementationOnce(() => ({
      select: mockSupabaseSelect.mockImplementationOnce(() => ({
        filter: mockSupabaseFilter
      }))
    })).mockImplementationOnce(() => ({
      select: jest.fn().mockResolvedValueOnce({
        data: [], // No descriptions
        error: null
      })
    }));
    
    render(<StudentDashboard />);
    
    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'EPA descriptions not found'
      );
    });
  });
});