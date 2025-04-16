import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock Supabase instance
const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    single: jest.fn()
};

// Mock the supabase client
jest.mock('@/utils/supabase/client', () => ({
    createClient: jest.fn(() => mockSupabase)
}));

import UnlistedStudentForm from '@/components/(RaterComponents)/UnlistedStudentForm';

// Mock data
const mockStudents = [
  { id: 'student-1', display_name: 'John Doe' },
  { id: 'student-2', display_name: 'Jane Smith' },
  { id: 'student-3', display_name: 'Alex Johnson' }
];

const mockSettings = [
  { id: 1, setting: 'Hospital' },
  { id: 2, setting: 'Clinic' },
  { id: 3, setting: 'School' }
];

const mockRoles = [
  { user_id: 'student-1', role: 'student' },
  { user_id: 'student-2', role: 'student' },
  { user_id: 'student-3', role: 'student' }
];

describe('UnlistedStudentForm', () => {
  const mockProps = {
    raterId: 'rater-123',
    hasActiveRequestForStudent: jest.fn().mockReturnValue(false),
    existingRequests: [],
    onSuccess: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup more granular mock responses for each specific chain of methods
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'user_roles') {
        return {
          select: () => {
            return {
              eq: () => {
                return Promise.resolve({ data: mockRoles });
              }
            };
          }
        };
      } else if (table === 'profiles') {
        return {
          select: () => {
            return {
              in: () => {
                return {
                  eq: () => {
                    return Promise.resolve({ data: mockStudents });
                  }
                };
              }
            };
          }
        };
      } else if (table === 'clinical_settings') {
        return {
          select: () => {
            return Promise.resolve({ data: mockSettings });
          }
        };
      } else if (table === 'form_requests') {
        return {
          insert: () => {
            return {
              select: () => {
                return {
                  single: () => {
                    return Promise.resolve({ data: { id: 'new-request-123' } });
                  }
                };
              }
            };
          }
        };
      }
      return mockSupabase;
    });
  });

  test('renders form fields correctly', async () => {
    render(<UnlistedStudentForm {...mockProps} />);
    
    // Check initial render
    expect(screen.getByLabelText('Select Student')).toBeInTheDocument();
    expect(screen.getByLabelText('Clinical Setting')).toBeInTheDocument();
    expect(screen.getByLabelText('student-goals-value')).toBeInTheDocument();
    expect(screen.getByLabelText('additional-notes-value')).toBeInTheDocument();
    expect(screen.getByText('Submit')).toBeInTheDocument();
    
    // Wait for data fetch to complete
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('user_roles');
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.from).toHaveBeenCalledWith('clinical_settings');
    });
  });

  test('shows error message when required fields are missing', async () => {
    render(<UnlistedStudentForm {...mockProps} />);
    
    // Submit without filling required fields
    waitFor(() => {
      fireEvent.click(screen.getByText('Submit'));
    });
    
    // Check error message
    expect(screen.getByText('All fields are required.')).toBeInTheDocument();
  });

  test('shows error message when student already requested', async () => {
    const propsWithExistingRequest = {
      ...mockProps,
      hasActiveRequestForStudent: jest.fn().mockReturnValue(true)
    };
    
    render(<UnlistedStudentForm {...propsWithExistingRequest} />);
    
    // Wait for options to load
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('user_roles');
    });
    
    // Select student
    const studentSelect = screen.getByLabelText('Select Student');
    
    fireEvent.focus(studentSelect);
    fireEvent.keyDown(studentSelect, { key: 'ArrowDown' });
    fireEvent.click(screen.getByText('John Doe'));
    
    // Select setting
    const settingSelect = screen.getByLabelText('Clinical Setting');
    fireEvent.focus(settingSelect);
    fireEvent.keyDown(settingSelect, { key: 'ArrowDown' });
    fireEvent.click(screen.getByText('Hospital'));
    
    // Add details
    fireEvent.change(screen.getByLabelText('additional-notes-value'), { 
      target: { value: 'Test details' } 
    });
    
    // Submit form
    fireEvent.click(screen.getByText('Submit'));
    
    // Check error message
    expect(screen.getByText('This student already has an active evaluation request. Please check your dashboard.')).toBeInTheDocument();
    expect(propsWithExistingRequest.hasActiveRequestForStudent).toHaveBeenCalledWith('student-1');
  });

  test('submits form successfully', async () => {
    render(<UnlistedStudentForm {...mockProps} />);
    
    // Wait for options to load
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('user_roles');
    });
    
    // Select student
    const studentSelect = screen.getByLabelText('Select Student');
    fireEvent.focus(studentSelect);
    fireEvent.keyDown(studentSelect, { key: 'ArrowDown' });
    fireEvent.click(screen.getByText('John Doe'));
    
    // Select setting
    const settingSelect = screen.getByLabelText('Clinical Setting');
    fireEvent.focus(settingSelect);
    fireEvent.keyDown(settingSelect, { key: 'ArrowDown' });
    fireEvent.click(screen.getByText('Hospital'));
    
    // Fill form fields
    fireEvent.change(screen.getByLabelText('student-goals-value'), { 
      target: { value: 'Improve clinical skills' } 
    });
    
    fireEvent.change(screen.getByLabelText('additional-notes-value'), { 
      target: { value: 'Student shows great potential' } 
    });
    
    // Submit form
    fireEvent.click(screen.getByText('Submit'));
    
    // Wait for submission to complete
    await waitFor(() => {
      expect(mockProps.onSuccess).toHaveBeenCalledWith('new-request-123');
    });
  });

  test('handles form submission error', async () => {
    // Setup error response for form submission
    const originalConsoleError = console.error;
    const mockConsoleError = jest.fn();
    console.error = mockConsoleError;
    
    try {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'form_requests') {
          return {
            insert: () => {
              return {
                select: () => {
                  return {
                    single: () => {
                      return Promise.resolve({ error: { message: 'Database error' }, data: null });
                    }
                  };
                }
              };
            }
          };
        } else if (table === 'user_roles') {
          return {
            select: () => {
              return {
                eq: () => {
                  return Promise.resolve({ data: mockRoles });
                }
              };
            }
          };
        } else if (table === 'profiles') {
          return {
            select: () => {
              return {
                in: () => {
                  return {
                    eq: () => {
                      return Promise.resolve({ data: mockStudents });
                    }
                  };
                }
              };
            }
          };
        } else if (table === 'clinical_settings') {
          return {
            select: () => {
              return Promise.resolve({ data: mockSettings });
            }
          };
        }
        return mockSupabase;
      });
      
      render(<UnlistedStudentForm {...mockProps} />);
      // Wait for options to load
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('user_roles');
      });
      
      // Select student
      const studentSelect = screen.getByLabelText('Select Student');
      fireEvent.focus(studentSelect);
      fireEvent.keyDown(studentSelect, { key: 'ArrowDown' });
      fireEvent.click(screen.getByText('John Doe'));
      
      // Select setting
      const settingSelect = screen.getByLabelText('Clinical Setting');
      fireEvent.focus(settingSelect);
      fireEvent.keyDown(settingSelect, { key: 'ArrowDown' });
      fireEvent.click(screen.getByText('Hospital'));
      
      // Add details
      fireEvent.change(screen.getByLabelText('additional-notes-value'), { 
        target: { value: 'Test details' } 
      });
      
      // Submit form
      fireEvent.click(screen.getByText('Submit'));

      // Check error message
      await waitFor(() => {
        expect(screen.getByText('Error submitting form.')).toBeInTheDocument();
        expect(mockConsoleError).toHaveBeenCalled();
      });
    } finally {
      console.error = originalConsoleError;
    }
  });

  test('disables submit button while loading', async () => {
    // Delay the response to test loading state
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'form_requests') {
        return {
          insert: () => {
            return {
              select: () => {
                return {
                  single: () => {
                    return new Promise(resolve => {
                      setTimeout(() => {
                        resolve({ data: { id: 'new-request-123' } });
                      }, 100);
                    });
                  }
                };
              }
            };
          }
        };
      } else if (table === 'user_roles') {
        return {
          select: () => {
            return {
              eq: () => {
                return Promise.resolve({ data: mockRoles });
              }
            };
          }
        };
      } else if (table === 'profiles') {
        return {
          select: () => {
            return {
              in: () => {
                return {
                  eq: () => {
                    return Promise.resolve({ data: mockStudents });
                  }
                };
              }
            };
          }
        };
      } else if (table === 'clinical_settings') {
        return {
          select: () => {
            return Promise.resolve({ data: mockSettings });
          }
        };
      }
      return mockSupabase;
    });
    
    render(<UnlistedStudentForm {...mockProps} />);
    
    // Wait for options to load and fill form
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('user_roles');
    });
    
    // Select student and setting
    const studentSelect = screen.getByLabelText('Select Student');
    fireEvent.focus(studentSelect);
    fireEvent.keyDown(studentSelect, { key: 'ArrowDown' });
    fireEvent.click(screen.getByText('John Doe'));
    
    const settingSelect = screen.getByLabelText('Clinical Setting');
    fireEvent.focus(settingSelect);
    fireEvent.keyDown(settingSelect, { key: 'ArrowDown' });
    fireEvent.click(screen.getByText('Hospital'));
    
    // Add details
    fireEvent.change(screen.getByLabelText('additional-notes-value'), { 
      target: { value: 'Test details' } 
    });
    
    // Submit form
    fireEvent.click(screen.getByText('Submit'));
    
    // Check button is disabled and shows loading text
    expect(screen.getByText('Submitting...')).toBeInTheDocument();
    expect(screen.getByText('Submitting...')).toBeDisabled();
    
    // Wait for submission to complete
    await waitFor(() => {
      expect(mockProps.onSuccess).toHaveBeenCalledWith('new-request-123');
      expect(screen.getByText('Submit')).toBeInTheDocument();
    });
  });
});