import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UnlistedStudentForm from '@/components/(RaterComponents)/UnlistedStudentForm';

/**
 * Mock the Supabase client inside jest.mock
 * so the component and test use the same mock instance.
 */
jest.mock('@/utils/supabase/client', () => {
  const mockFrom = jest.fn();

  return {
    createClient: () => ({
      from: mockFrom,
    }),
    __mockFrom: mockFrom,
  };
});

/**
 * Access the same mockFrom function used inside the component.
 */
const { __mockFrom: mockFrom } = require('@/utils/supabase/client');

/**
 * Mock data returned from Supabase queries.
 */
const mockStudents = [{ id: 'student-1', display_name: 'John Doe' }];

const mockSettings = [{ id: 1, setting: 'Hospital' }];

const mockRoles = [{ user_id: 'student-1', role: 'student' }];

describe('UnlistedStudentForm (.ts version)', () => {
  /**
   * Mock props passed into the component.
   */
  const mockProps = {
    raterId: 'rater-123',
    hasActiveRequestForStudent: jest.fn().mockReturnValue(false),
    existingRequests: [],
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    /**
     * Reset all mocks before each test.
     */
    jest.clearAllMocks();

    /**
     * Mock Supabase query behavior based on table name.
     */
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_roles') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: mockRoles, error: null }),
          }),
        };
      }

      if (table === 'profiles') {
        return {
          select: () => ({
            in: () => ({
              eq: () => Promise.resolve({ data: mockStudents, error: null }),
            }),
          }),
        };
      }

      if (table === 'clinical_settings') {
        return {
          select: () => Promise.resolve({ data: mockSettings, error: null }),
        };
      }

      if (table === 'form_requests') {
        return {
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: 'new-request-123' },
                  error: null,
                }),
            }),
          }),
        };
      }

      return {};
    });
  });

  /**
   * Test that the form renders correctly.
   */
  test('renders form', async () => {
    render(React.createElement(UnlistedStudentForm, mockProps));

    expect(screen.getByText('Submit')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('user_roles');
    });
  });

  /**
   * Test that validation message appears
   * when required fields are left empty.
   */
  test('shows validation error', async () => {
    render(React.createElement(UnlistedStudentForm, mockProps));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('user_roles');
      expect(mockFrom).toHaveBeenCalledWith('profiles');
      expect(mockFrom).toHaveBeenCalledWith('clinical_settings');
    });

    fireEvent.click(screen.getByText('Submit'));

    expect(screen.getByText('All fields are required.')).toBeInTheDocument();
  });

  /**
   * Test successful form submission.
   * This fills all required fields, including the React Select inputs.
   */
  test('submits successfully', async () => {
    render(React.createElement(UnlistedStudentForm, mockProps));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalled();
    });

    // Select student from react-select
    const studentInput = screen.getByLabelText('Select Student');
    fireEvent.focus(studentInput);
    fireEvent.keyDown(studentInput, { key: 'ArrowDown' });
    fireEvent.click(await screen.findByText('John Doe'));

    // Select clinical setting from react-select
    const settingInput = screen.getByLabelText('Clinical Setting');
    fireEvent.focus(settingInput);
    fireEvent.keyDown(settingInput, { key: 'ArrowDown' });
    fireEvent.click(await screen.findByText('Hospital'));

    // Fill textareas
    fireEvent.change(screen.getByLabelText('student-goals-value'), {
      target: { value: 'Test goal' },
    });

    fireEvent.change(screen.getByLabelText('additional-notes-value'), {
      target: { value: 'Test notes' },
    });

    // Submit form
    fireEvent.click(screen.getByText('Submit'));

    // Verify success callback was called
    await waitFor(() => {
      expect(mockProps.onSuccess).toHaveBeenCalled();
    });
  });
});