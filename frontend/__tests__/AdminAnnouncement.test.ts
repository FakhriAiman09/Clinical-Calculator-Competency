import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

let AdminSettingsButtons: typeof import('@/components/(AdminComponents)/AdminSettingsButtons').default;

/*
  ==========================================
  TYPES
  ==========================================
*/
interface ClinicalSetting {
  id: string;
  setting: string;
}

/*
  ==========================================
  MOCK DATA
  ==========================================
*/
let mockSettings: ClinicalSetting[] = [];
let mockSupabaseError: Error | null = null;

/*
  ==========================================
  MOCK FUNCTIONS
  ==========================================
*/
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdateEq = jest.fn();
const mockDeleteEq = jest.fn();

var mockFrom = jest.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: jest.fn(() => ({
    eq: mockUpdateEq,
  })),
  delete: jest.fn(() => ({
    eq: mockDeleteEq,
  })),
}));

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

/*
  ==========================================
  TEST SUITE
  ==========================================
*/
describe('AdminSettingsButtons Component (.ts version)', () => {
  const initialSettings: ClinicalSetting[] = [
    { id: '1', setting: 'Hospital' },
    { id: '2', setting: 'Clinic' },
  ];

  beforeEach(() => {
    AdminSettingsButtons = require('@/components/(AdminComponents)/AdminSettingsButtons').default;
    mockSettings = [...initialSettings];
    mockSupabaseError = null;
    jest.clearAllMocks();

    mockSelect.mockImplementation(() =>
      Promise.resolve({
        data: [...mockSettings],
        error: mockSupabaseError,
      })
    );

    mockInsert.mockImplementation((data: Array<{ setting: string }>) => {
      if (!mockSupabaseError) {
        const newItem: ClinicalSetting = {
          id: String(mockSettings.length + 1),
          setting: data[0].setting,
        };
        mockSettings.push(newItem);
      }

      return Promise.resolve({
        data: null,
        error: mockSupabaseError,
      });
    });

    mockUpdateEq.mockImplementation((_column: string, id: string) => {
      if (!mockSupabaseError) {
        mockSettings = mockSettings.map((item) =>
          item.id === id ? { ...item, setting: 'General Hospital' } : item
        );
      }

      return Promise.resolve({
        data: mockSettings,
        error: mockSupabaseError,
      });
    });

    mockDeleteEq.mockImplementation((_column: string, id: string) => {
      if (!mockSupabaseError) {
        mockSettings = mockSettings.filter((item) => item.id !== id);
      }

      return Promise.resolve({
        data: null,
        error: mockSupabaseError,
      });
    });
  });

  test('renders correctly', async () => {
    const rendered = render(React.createElement(AdminSettingsButtons));

    await waitFor(() => {
      expect(rendered.container).toBeInTheDocument();
    });

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Edit Clinical Settings')).toBeInTheDocument();
  });

  test('opens modal', async () => {
    render(React.createElement(AdminSettingsButtons));

    fireEvent.click(screen.getByText('Edit Clinical Settings'));

    expect(await screen.findByText('Clinical Settings')).toBeInTheDocument();
  });

  test('fetches and displays settings', async () => {
    render(React.createElement(AdminSettingsButtons));

    fireEvent.click(screen.getByText('Edit Clinical Settings'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Hospital')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Clinic')).toBeInTheDocument();
    });
  });

  test('adds a new setting', async () => {
    render(React.createElement(AdminSettingsButtons));

    fireEvent.click(screen.getByText('Edit Clinical Settings'));

    const input = await screen.findByPlaceholderText('Enter new setting name');

    fireEvent.change(input, { target: { value: 'Pharmacy' } });
    fireEvent.click(screen.getByText('Add Setting'));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled();
      expect(screen.getByDisplayValue('Pharmacy')).toBeInTheDocument();
    });

    expect(mockSettings[2].setting).toBe('Pharmacy');
  });

  test('updates a setting', async () => {
    render(React.createElement(AdminSettingsButtons));

    fireEvent.click(screen.getByText('Edit Clinical Settings'));

    const input = await screen.findByDisplayValue('Hospital');

    fireEvent.change(input, { target: { value: 'General Hospital' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockUpdateEq).toHaveBeenCalledWith('id', '1');
      expect(screen.getByDisplayValue('General Hospital')).toBeInTheDocument();
    });
  });

  test('deletes a setting', async () => {
    render(React.createElement(AdminSettingsButtons));

    fireEvent.click(screen.getByText('Edit Clinical Settings'));

    await screen.findByDisplayValue('Hospital');

    const deleteButtons = screen.getAllByRole('button', {
      name: 'delete-setting',
    });

    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockDeleteEq).toHaveBeenCalledWith('id', '1');
      expect(mockSettings).toHaveLength(1);
    });

    expect(mockSettings[0].setting).toBe('Clinic');
  });

  test('handles fetch error', async () => {
    mockSupabaseError = new Error('Fetch failed');

    mockSelect.mockImplementationOnce(() =>
      Promise.resolve({
        data: null,
        error: mockSupabaseError,
      })
    );

    render(React.createElement(AdminSettingsButtons));

    fireEvent.click(screen.getByText('Edit Clinical Settings'));

    await waitFor(() => {
      expect(screen.queryByDisplayValue('Hospital')).not.toBeInTheDocument();
    });
  });
});