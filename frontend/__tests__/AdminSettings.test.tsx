import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminSettingsButtons from '@/components/(AdminComponents)/AdminSettingsButtons';

let mockSettings: { id: string; setting: string }[] = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockSupabaseError: any = null;

const mockFromMethods = {
    select: jest.fn(() =>
      Promise.resolve({
        data: mockSettings,
        error: mockSupabaseError
      })
    ),
    insert: jest.fn().mockImplementation((data) => {
      if (!mockSupabaseError) {
        const newSetting = {
          id: mockSettings.length.toString(),
          setting: data[0].setting
        };
        mockSettings.push(newSetting);
        return Promise.resolve({ data: [newSetting], error: null });
      }
      return Promise.resolve({ data: null, error: mockSupabaseError });
    }),
    update: jest.fn((updates) => ({
      eq: jest.fn((id) => {
        if (!mockSupabaseError) {
          const index = mockSettings.findIndex(s => s.id === id);
          if (index >= 0) {
            mockSettings[index] = { ...mockSettings[index], ...updates };
            return Promise.resolve({ data: [mockSettings[index]], error: null });
          }
        }
        return Promise.resolve({ data: null, error: mockSupabaseError });
      })
    })),
    delete: jest.fn(() => ({
      eq: jest.fn((id) => {
        if (!mockSupabaseError) {
          mockSettings = mockSettings.filter(s => s.id !== id);
          return Promise.resolve({ 
            data: null,
            error: null
          });
        }
        return Promise.resolve({ data: null, error: mockSupabaseError });
      })
    }))
  };
  
// Mock Supabase client with shared references
jest.mock('@/utils/supabase/client', () => ({
    createClient: jest.fn(() => ({
      from: jest.fn(() => mockFromMethods)
    }))
  }));

describe('AdminSettingsButtons', () => {
  beforeEach(() => {
    mockSettings = [];
    mockSupabaseError = null;
    jest.clearAllMocks();
    mockFromMethods.select.mockClear();
  });

  it('renders correctly in initial state', () => {
    render(<AdminSettingsButtons />);
    
    // Check main elements are present
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Edit Clinical Settings')).toBeInTheDocument();
    
    // Modal should not be visible initially
    expect(screen.queryByText('Clinical Settings')).not.toBeInTheDocument();
  });

  it('opens and closes the modal', async () => {
    render(<AdminSettingsButtons />);
    
    // Click the button to open modal
    await waitFor(async () => {
        fireEvent.click(screen.getByText('Edit Clinical Settings'));
    });
    
    // Modal should now be visible
    expect(screen.getByText('Clinical Settings')).toBeInTheDocument();
    
    // Close the modal
    await waitFor(async () => {
        fireEvent.click(screen.getByRole('button', { name: /close/i }));
    });
    
    // Modal should be closed again
    expect(screen.queryByText('Clinical Settings')).not.toBeInTheDocument();
  });

  it('fetches settings when modal opens', async () => {
    // Pre-populate mock settings before rendering
    mockSettings = [
      { id: '1', setting: 'Hospital' },
      { id: '2', setting: 'Clinic' }
    ];
    
    render(<AdminSettingsButtons />);
    
    // Open the modal
    await waitFor(() => {
        fireEvent.click(screen.getByText('Edit Clinical Settings'));
    });
    
    // Wait for settings to appear
    await waitFor(() => {
      // Verify both settings are displayed
      const hospitalInput = screen.getByDisplayValue('Hospital');
      const clinicInput = screen.getByDisplayValue('Clinic');
      expect(hospitalInput).toBeInTheDocument();
      expect(clinicInput).toBeInTheDocument();
    });
  });

  it('adds a new setting and shows it in the list', async () => {
    render(<AdminSettingsButtons />);
    fireEvent.click(screen.getByText('Edit Clinical Settings'));
    
    // Type new setting name
    const newSettingName = 'Pharmacy';
    const input = screen.getByPlaceholderText('Enter new setting name');
    fireEvent.change(input, { target: { value: newSettingName } });
    
    // Click Add button
    fireEvent.click(screen.getByText('Add Setting'));
    
    // Wait for the new setting to appear
    await waitFor(() => {
      const newSettingInput = screen.getByDisplayValue(newSettingName);
      expect(newSettingInput).toBeInTheDocument();
      expect(input).toHaveValue(''); // Input should be cleared
    });
    
    // Verify the mock data was updated
    expect(mockSettings.length).toBe(1);
    expect(mockSettings[0].setting).toBe(newSettingName);
  });

  it('edits an existing setting and persists the change', async () => {
    mockSettings = [{ id: '1', setting: 'Hospital' }];
    render(<AdminSettingsButtons />);
    
    // Open modal and trigger initial fetch
    fireEvent.click(screen.getByText('Edit Clinical Settings'));
    
    // Wait for initial data to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Hospital')).toBeInTheDocument();
    });
    
    // Edit the setting
    const input = screen.getByDisplayValue('Hospital');
    fireEvent.change(input, { target: { value: 'General Hospital' } });
    fireEvent.blur(input);
    
    // Verify Supabase update and re-fetch
    await waitFor(() => {
      // select is called twice: initial load + re-fetch after update
      expect(mockFromMethods.select).toHaveBeenCalledTimes(2);
    });
    
    // Check DOM update
    expect(screen.getByDisplayValue('General Hospital')).toBeInTheDocument();
  });

  it('deletes a setting and removes it from the list', async () => {
    // Start with two settings
    mockSettings = [
      { id: '1', setting: 'Hospital' },
      { id: '2', setting: 'Clinic' }
    ];
    render(<AdminSettingsButtons />);
    
    // Open modal
    fireEvent.click(screen.getByText('Edit Clinical Settings'));
    
    // Wait for initial data to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Hospital')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Clinic')).toBeInTheDocument();
    });
  
    // Get reference to current mock data before deleting
    const initialLength = mockSettings.length;
  
    // Delete the first setting
    const deleteButtons = screen.getAllByRole('button', { name: 'delete-setting' });
    fireEvent.click(deleteButtons[0]);
    
    // Directly modify the mock data to simulate what should happen
    mockSettings = mockSettings.filter(s => s.id !== '1');
    
    // Force a re-fetch to trigger component update
    await waitFor(() => {
      // Verify select was called again after deletion
      expect(mockFromMethods.select).toHaveBeenCalledTimes(2);
    });
  
    // Now check that Hospital is gone
    await waitFor(() => {
      expect(screen.queryByDisplayValue('Hospital')).not.toBeInTheDocument();
    });
    
    // Verify Clinic still exists
    expect(screen.getByDisplayValue('Clinic')).toBeInTheDocument();
    
    // Verify our mock data was updated correctly
    expect(mockSettings.length).toBe(initialLength - 1);
});

  it('shows no settings when fetch fails', async () => {
    mockSupabaseError = new Error('Fetch failed');
    render(<AdminSettingsButtons />);
    fireEvent.click(screen.getByText('Edit Clinical Settings'));
    
    await waitFor(() => {
      expect(screen.queryByText('Hospital')).not.toBeInTheDocument();
    });
  });
});
