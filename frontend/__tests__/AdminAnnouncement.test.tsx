// adminAnnouncements.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminAnnouncements from '@/components/(AdminComponents)/AdminAnnouncements';
import { createClient } from '@/utils/supabase/client';

// Mock dynamic imports
jest.mock('next/dynamic', () => ({
    __esModule: true,
    default: () => {
    interface ComponentProps {
      value: string;
      onChange?: (value: string) => void;
    }

    const Component: React.FC<ComponentProps> = (props) => {
      return (
        <textarea
        data-testid="mdeditor"
        value={props.value}
        onChange={(e) => props.onChange && props.onChange(e.target.value)}
        />
      );
    };
      Component.displayName = 'MDEditor';
      return Component;
    }
  }));

// Mock Markdown Preview
jest.mock('@uiw/react-markdown-preview', () => ({
  __esModule: true,
  default: ({ source }: { source: string }) => <div data-testid="md-preview">{source}</div>
}));

let mockSupabaseData: ({ id: string; message: string; start_date: string; end_date: string; announcement_type: "info"; } | { id: string; message: string; start_date: string; end_date: string; announcement_type: "warning"; })[];
const mockSupabaseError = null;

// Mock Supabase
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockImplementation(() =>
        Promise.resolve({ data: mockSupabaseData, error: mockSupabaseError })
      ),
      insert: jest.fn().mockImplementation((data) => {
        // When insert is called, add the item to mockSupabaseData for future fetches
        if (data && !mockSupabaseError) {
          const newId = `${mockSupabaseData.length + 1}`;
          const newItem = { ...data, id: newId };
          mockSupabaseData = [...mockSupabaseData, newItem];
        }
        return {
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: `${mockSupabaseData.length}` },
            error: mockSupabaseError
          })
        };
      }),
      update: jest.fn().mockImplementation(() => ({
        eq: jest.fn().mockImplementation(() =>
          Promise.resolve({ data: mockSupabaseData, error: mockSupabaseError })
        ),
      })),
      delete: jest.fn().mockImplementation(() => ({
        eq: jest.fn().mockImplementation(() => {
          return Promise.resolve({ error: mockSupabaseError });
        })
      }))
    }))
  }))
}));

describe('AdminAnnouncements Component', () => {
  const mockAnnouncements = [
    {
      id: '1',
      message: 'Test announcement 1',
      start_date: '2023-01-01T00:00:00',
      end_date: '2023-01-31T01:00:00',
      announcement_type: 'info' as const
    },
    {
      id: '2',
      message: 'Test announcement 2',
      start_date: '2023-02-01T01:00:00',
      end_date: '2023-02-28T02:00:00',
      announcement_type: 'warning' as const
    },
  ];

  beforeEach(() => {
    mockSupabaseData = [...mockAnnouncements];
    jest.clearAllMocks();
  });

  test('renders correctly with initial state', async () => {
    const { container } = render(<AdminAnnouncements />);
    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
    
    // Check header
    expect(screen.getByText('Create System Announcement')).toBeInTheDocument();
    expect(screen.getByText('Announcement Message (Markdown Supported)')).toBeInTheDocument();
    // Check form fields
    expect(screen.getByTestId('mdeditor')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Start Date')).toBeInTheDocument();
    expect(screen.getByText('End Date')).toBeInTheDocument();
    
    // Check existing announcements section
    expect(screen.getByText('Existing Announcements')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Test announcement 1/)).toBeInTheDocument();
      expect(screen.getByText(/Test announcement 2/)).toBeInTheDocument();
    });
  });

  test('creates a new announcement successfully', async () => {
    render(<AdminAnnouncements />);
    await waitFor(() => {
      expect(screen.getByText(/Test announcement 1/)).toBeInTheDocument();
    });
  
    // Fill out the form
    const newAnnouncementText = 'New test announcement';
    
    // Get the textarea and simulate input
    const mdEditor = screen.getByTestId('mdeditor');
    await waitFor(() => {
        fireEvent.change(mdEditor, { target: { value: newAnnouncementText } });
    
        // Handle select and date inputs
        fireEvent.change(screen.getByLabelText(/Type/i), {
            target: { value: 'danger' },
        });
    
        fireEvent.change(screen.getByLabelText(/Start Date/i), {
            target: { value: '2023-03-01T00:00' },
        });
        
        fireEvent.change(screen.getByLabelText(/End Date/i), {
            target: { value: '2023-03-31T00:00' },
        });
    
        // Submit the form
        fireEvent.click(screen.getByRole('button', { name: /save announcement/i }));
    });
    
    // Verify the new announcement was "added" to our mock data
    expect(mockSupabaseData.length).toBe(3);
    expect(mockSupabaseData[2].message).toBe(newAnnouncementText);
  });

  test('shows validation errors for empty fields', async () => {
    render(<AdminAnnouncements />);
    
    // Try to submit empty form
    fireEvent.click(screen.getByRole('button', { name: /save announcement/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Please fill out all required fields.')).toBeInTheDocument();
    });
  });

  test('shows error when fetch fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Override the mock for this test
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Fetch failed'),
      })
    });
    
    (createClient as jest.Mock).mockImplementationOnce(() => ({
      from: mockFrom
    }));

    render(<AdminAnnouncements />);
    
    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Fetch error:', expect.any(Error));
    });
    
    consoleError.mockRestore();
  });

  test('shows empty state when no announcements exist', async () => {
    // Override the mock for this test
    mockSupabaseData = [];

    render(<AdminAnnouncements />);
    
    expect(await screen.findByText('No announcements found.')).toBeInTheDocument();
  });
});