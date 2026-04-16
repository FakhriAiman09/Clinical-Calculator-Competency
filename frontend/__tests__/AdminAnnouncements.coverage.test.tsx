import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

jest.mock('next/dynamic', () => {
  return () => {
    const Editor = require('@uiw/react-md-editor').default;
    return Editor;
  };
});

const mockOrder = jest.fn();
const mockSelect = jest.fn(() => ({ order: mockOrder }));
const mockInsert = jest.fn();
const mockUpdateEq = jest.fn();
const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));
const mockDeleteEq = jest.fn();
const mockDelete = jest.fn(() => ({ eq: mockDeleteEq }));

const mockFrom = jest.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
}));

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

import AdminAnnouncements from '@/components/(AdminComponents)/AdminAnnouncements';

describe('AdminAnnouncements coverage', () => {
  const baseAnnouncements = [
    {
      id: 'a1',
      message: 'System maintenance tonight',
      start_date: '2026-04-10T08:00',
      end_date: '2026-04-20T08:00',
      announcement_type: 'info',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockOrder.mockResolvedValue({ data: [...baseAnnouncements], error: null });
    mockInsert.mockResolvedValue({ data: null, error: null });
    mockUpdateEq.mockResolvedValue({ data: null, error: null });
    mockDeleteEq.mockResolvedValue({ data: null, error: null });
  });

  test('fetches and renders existing announcements', async () => {
    render(<AdminAnnouncements />);

    expect(await screen.findByText(/Existing Announcements/i)).toBeInTheDocument();
    expect(await screen.findByText(/System maintenance tonight/i)).toBeInTheDocument();
    expect(mockFrom).toHaveBeenCalledWith('announcements');
  });

  test('shows validation error when required fields are missing', async () => {
    render(<AdminAnnouncements />);

    fireEvent.click(screen.getByRole('button', { name: /Save Announcement/i }));

    expect(await screen.findByText(/Please fill out all required fields/i)).toBeInTheDocument();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  test('shows validation error when end date is before start date', async () => {
    render(<AdminAnnouncements />);

    fireEvent.change(screen.getByTestId('mdeditor'), { target: { value: 'Announcement content' } });
    fireEvent.change(screen.getByLabelText(/Start Date/i), { target: { value: '2026-04-20T12:00' } });
    fireEvent.change(screen.getByLabelText(/End Date/i), { target: { value: '2026-04-20T11:00' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Announcement/i }));

    expect(await screen.findByText(/End date must be after start date/i)).toBeInTheDocument();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  test('inserts a new announcement when form is valid', async () => {
    render(<AdminAnnouncements />);

    fireEvent.change(screen.getByTestId('mdeditor'), { target: { value: 'Hello **team**' } });
    fireEvent.change(screen.getByLabelText(/Start Date/i), { target: { value: '2026-04-20T10:00' } });
    fireEvent.change(screen.getByLabelText(/End Date/i), { target: { value: '2026-04-21T10:00' } });
    fireEvent.change(screen.getByLabelText(/Type/i), { target: { value: 'warning' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Announcement/i }));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Hello **team**',
        start_date: '2026-04-20T10:00',
        end_date: '2026-04-21T10:00',
        announcement_type: 'warning',
      }),
    );
  });

  test('loads an announcement into form and updates it', async () => {
    const { container } = render(<AdminAnnouncements />);

    await screen.findByText(/System maintenance tonight/i);

    const pencilIcon = container.querySelector('.bi-pencil');
    expect(pencilIcon).toBeTruthy();
    fireEvent.click((pencilIcon as HTMLElement).closest('button') as HTMLButtonElement);

    expect(screen.getByRole('heading', { name: /Edit Announcement/i })).toBeInTheDocument();
    expect(screen.getByTestId('mdeditor')).toHaveValue('System maintenance tonight');

    fireEvent.change(screen.getByTestId('mdeditor'), { target: { value: 'Updated message' } });
    fireEvent.click(screen.getByRole('button', { name: /Update Announcement/i }));

    await waitFor(() => {
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 'a1');
    });
  });

  test('opens delete modal and confirms deletion', async () => {
    const { container } = render(<AdminAnnouncements />);

    await screen.findByText(/System maintenance tonight/i);

    const trashIcon = container.querySelector('.bi-trash');
    expect(trashIcon).toBeTruthy();
    fireEvent.click((trashIcon as HTMLElement).closest('button') as HTMLButtonElement);

    const modal = await screen.findByText(/Confirm Deletion/i);
    expect(modal).toBeInTheDocument();

    const modalRoot = modal.closest('.modal-content') as HTMLElement;
    fireEvent.click(within(modalRoot).getByRole('button', { name: /Delete/i }));

    await waitFor(() => {
      expect(mockDeleteEq).toHaveBeenCalledWith('id', 'a1');
    });
  });
});
