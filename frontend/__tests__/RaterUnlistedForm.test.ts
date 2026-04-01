import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UnlistedStudentForm from '@/components/(RaterComponents)/UnlistedStudentForm';

// Use var here because jest.mock is hoisted.
// If const/let is used, Jest may try to access it before initialization.
var mockSupabase = {
  from: jest.fn(),
};

// Mock the Supabase client used inside the component
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

// Mock data returned from Supabase
const mockStudents = [
  { id: 'student-1', display_name: 'John Doe' },
  { id: 'student-2', display_name: 'Jane Smith' },
  { id: 'student-3', display_name: 'Alex Johnson' },
];

const mockSettings = [
  { id: 1, setting: 'Hospital' },
  { id: 2, setting: 'Clinic' },
  { id: 3, setting: 'School' },
];

const mockRoles = [
  { user_id: 'student-1', role: 'student' },
  { user_id: 'student-2', role: 'student' },
  { user_id: 'student-3', role: 'student' },
];

describe('UnlistedStudentForm Component (.ts version)', () => {
  const mockProps = {
    raterId: 'rater-123',
    hasActiveRequestForStudent: jest.fn().mockReturnValue(false),
    existingRequests: [],
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocked database behavior
    mockSupabase.from.mockImplementation((table: string) => {
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

  // Helper for selecting options from react-select
  const selectReactSelectOption = async (
    labelText: string,
    optionText: string
  ) => {
    const input = screen.getByLabelText(labelText);

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });

    const option = await screen.findByText(optionText);
    fireEvent.click(option);
  };

  test('renders form fields correctly', async () => {
    render(React.createElement(UnlistedStudentForm, mockProps));

    // Check main fields appear
    expect(screen.getByLabelText('Select Student')).toBeInTheDocument();
    expect(screen.getByLabelText('Clinical Setting')).toBeInTheDocument();
    expect(screen.getByLabelText('student-goals-value')).toBeInTheDocument();
    expect(screen.getByLabelText('additional-notes-value')).toBeInTheDocument();
    expect(screen.getByText('Submit')).toBeInTheDocument();

    // Wait for async fetches to finish
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('user_roles');
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.from).toHaveBeenCalledWith('clinical_settings');
    });
  });

  test('shows error message when required fields are missing', async () => {
    render(React.createElement(UnlistedStudentForm, mockProps));

    // Wait for initial fetch so state updates settle
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('user_roles');
    });

    fireEvent.click(screen.getByText('Submit'));

    expect(screen.getByText('All fields are required.')).toBeInTheDocument();
  });

  test('shows error message when student already requested', async () => {
    const propsWithExistingRequest = {
      ...mockProps,
      hasActiveRequestForStudent: jest.fn().mockReturnValue(true),
    };

    render(React.createElement(UnlistedStudentForm, propsWithExistingRequest));

    // Wait for dropdown data to load
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('user_roles');
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.from).toHaveBeenCalledWith('clinical_settings');
    });

    // Select student and setting
    await selectReactSelectOption('Select Student', 'John Doe');
    await selectReactSelectOption('Clinical Setting', 'Hospital');

    // Fill all required text fields
    fireEvent.change(screen.getByLabelText('student-goals-value'), {
      target: { value: 'Improve clinical skills' },
    });

    fireEvent.change(screen.getByLabelText('additional-notes-value'), {
      target: { value: 'Test details' },
    });

    fireEvent.click(screen.getByText('Submit'));

    expect(
      screen.getByText(
        'This student already has an active evaluation request. Please check your dashboard.'
      )
    ).toBeInTheDocument();

    expect(propsWithExistingRequest.hasActiveRequestForStudent).toHaveBeenCalledWith(
      'student-1'
    );
  });

  test('submits form successfully', async () => {
    render(React.createElement(UnlistedStudentForm, mockProps));

    // Wait for initial data load
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('user_roles');
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.from).toHaveBeenCalledWith('clinical_settings');
    });

    // Select options
    await selectReactSelectOption('Select Student', 'John Doe');
    await selectReactSelectOption('Clinical Setting', 'Hospital');

    // Fill required text areas
    fireEvent.change(screen.getByLabelText('student-goals-value'), {
      target: { value: 'Improve clinical skills' },
    });

    fireEvent.change(screen.getByLabelText('additional-notes-value'), {
      target: { value: 'Student shows great potential' },
    });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(mockProps.onSuccess).toHaveBeenCalledWith('new-request-123');
    });
  });

  test('handles form submission error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Override form_requests insert behavior for this test
    mockSupabase.from.mockImplementation((table: string) => {
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
                  data: null,
                  error: { message: 'Database error' },
                }),
            }),
          }),
        };
      }

      return {};
    });

    render(React.createElement(UnlistedStudentForm, mockProps));

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('user_roles');
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.from).toHaveBeenCalledWith('clinical_settings');
    });

    await selectReactSelectOption('Select Student', 'John Doe');
    await selectReactSelectOption('Clinical Setting', 'Hospital');

    // Fill all required fields so form reaches submit logic
    fireEvent.change(screen.getByLabelText('student-goals-value'), {
      target: { value: 'Improve clinical skills' },
    });

    fireEvent.change(screen.getByLabelText('additional-notes-value'), {
      target: { value: 'Test details' },
    });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.getByText('Error submitting form.')).toBeInTheDocument();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  test('disables submit button while loading', async () => {
    // Mock delayed submission to verify loading state
    mockSupabase.from.mockImplementation((table: string) => {
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
                new Promise((resolve) => {
                  setTimeout(() => {
                    resolve({
                      data: { id: 'new-request-123' },
                      error: null,
                    });
                  }, 100);
                }),
            }),
          }),
        };
      }

      return {};
    });

    render(React.createElement(UnlistedStudentForm, mockProps));

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('user_roles');
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.from).toHaveBeenCalledWith('clinical_settings');
    });

    await selectReactSelectOption('Select Student', 'John Doe');
    await selectReactSelectOption('Clinical Setting', 'Hospital');

    // Fill required fields
    fireEvent.change(screen.getByLabelText('student-goals-value'), {
      target: { value: 'Improve clinical skills' },
    });

    fireEvent.change(screen.getByLabelText('additional-notes-value'), {
      target: { value: 'Test details' },
    });

    fireEvent.click(screen.getByText('Submit'));

    // Check loading state
    expect(screen.getByText('Submitting...')).toBeInTheDocument();
    expect(screen.getByText('Submitting...')).toBeDisabled();

    await waitFor(() => {
      expect(mockProps.onSuccess).toHaveBeenCalledWith('new-request-123');
      expect(screen.getByText('Submit')).toBeInTheDocument();
    });
  });
});