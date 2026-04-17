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

  test('cancels delete modal without deleting', async () => {
    const { container } = render(<AdminAnnouncements />);

    await screen.findByText(/System maintenance tonight/i);

    const trashIcon = container.querySelector('.bi-trash');
    fireEvent.click((trashIcon as HTMLElement).closest('button') as HTMLButtonElement);

    const modal = await screen.findByText(/Confirm Deletion/i);
    const modalRoot = modal.closest('.modal-content') as HTMLElement;

    // Click the Cancel button — should close modal without deleting
    fireEvent.click(within(modalRoot).getByRole('button', { name: /Cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Confirm Deletion/i)).toBeNull();
    });
    expect(mockDeleteEq).not.toHaveBeenCalled();
  });

  test('closes delete modal via X button', async () => {
    const { container } = render(<AdminAnnouncements />);

    await screen.findByText(/System maintenance tonight/i);

    const trashIcon = container.querySelector('.bi-trash');
    fireEvent.click((trashIcon as HTMLElement).closest('button') as HTMLButtonElement);

    await screen.findByText(/Confirm Deletion/i);

    // Click the btn-close X button in the modal header
    const closeBtn = container.querySelector('.modal .btn-close');
    fireEvent.click(closeBtn as HTMLElement);

    await waitFor(() => {
      expect(screen.queryByText(/Confirm Deletion/i)).toBeNull();
    });
    expect(mockDeleteEq).not.toHaveBeenCalled();
  });

  test('shows error when fetchAnnouncements fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'Fetch failed' } });

    render(<AdminAnnouncements />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Fetch error:', expect.objectContaining({ message: 'Fetch failed' }));
    });
    consoleSpy.mockRestore();
  });

  test('shows error alert when update announcement fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockUpdateEq.mockResolvedValueOnce({ data: null, error: { message: 'Update failed' } });

    const { container } = render(<AdminAnnouncements />);
    await screen.findByText(/System maintenance tonight/i);

    // Load existing announcement into edit form
    const pencilIcon = container.querySelector('.bi-pencil');
    fireEvent.click((pencilIcon as HTMLElement).closest('button') as HTMLButtonElement);

    fireEvent.click(screen.getByRole('button', { name: /Update Announcement/i }));

    expect(await screen.findByText(/Failed to update announcement/i)).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  test('shows error alert when insert announcement fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockInsert.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } });

    render(<AdminAnnouncements />);

    fireEvent.change(screen.getByTestId('mdeditor'), { target: { value: 'New announcement' } });
    fireEvent.change(screen.getByLabelText(/Start Date/i), { target: { value: '2026-05-01T10:00' } });
    fireEvent.change(screen.getByLabelText(/End Date/i), { target: { value: '2026-05-02T10:00' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Announcement/i }));

    expect(await screen.findByText(/Failed to save announcement/i)).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  test('shows error alert when delete announcement fails', async () => {
    mockDeleteEq.mockResolvedValueOnce({ data: null, error: { message: 'Delete failed' } });

    const { container } = render(<AdminAnnouncements />);
    await screen.findByText(/System maintenance tonight/i);

    const trashIcon = container.querySelector('.bi-trash');
    fireEvent.click((trashIcon as HTMLElement).closest('button') as HTMLButtonElement);

    const modal = await screen.findByText(/Confirm Deletion/i);
    const modalRoot = modal.closest('.modal-content') as HTMLElement;
    fireEvent.click(within(modalRoot).getByRole('button', { name: /Delete/i }));

    expect(await screen.findByText(/Failed to delete announcement/i)).toBeInTheDocument();
  });

  test('renders danger preview style when type is danger and message is set', async () => {
    render(<AdminAnnouncements />);

    fireEvent.change(screen.getByTestId('mdeditor'), { target: { value: 'Danger announcement' } });
    fireEvent.change(screen.getByLabelText(/Type/i), { target: { value: 'danger' } });

    const matches = await screen.findAllByText(/Danger announcement/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  test('renders default preview style when type is set to unknown value', async () => {
    render(<AdminAnnouncements />);

    fireEvent.change(screen.getByTestId('mdeditor'), { target: { value: 'Unknown type' } });
    // Force an invalid type value by using an untyped event
    fireEvent.change(screen.getByLabelText(/Type/i), { target: { value: 'INVALID' } });

    const matches = await screen.findAllByText(/Unknown type/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  test('truncates announcement message when longer than 100 characters', async () => {
    const longMessage = 'A'.repeat(105);
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          id: 'a-long',
          message: longMessage,
          start_date: '2026-04-10T08:00',
          end_date: '2026-04-20T08:00',
          announcement_type: 'info',
        },
      ],
      error: null,
    });

    render(<AdminAnnouncements />);

    // Wait for the list item to appear, then verify the ellipsis is rendered
    await screen.findByText(/Existing Announcements/i);
    await waitFor(() => {
      expect(document.body.textContent).toContain('…');
    });
  });

  test('MDEditor onChange covers empty string fallback branch', async () => {
    render(<AdminAnnouncements />);

    // First set a value, then clear it to trigger val || '' with val=''
    fireEvent.change(screen.getByTestId('mdeditor'), { target: { value: 'Hello' } });
    fireEvent.change(screen.getByTestId('mdeditor'), { target: { value: '' } });

    // Editor should now be empty (no message preview shown)
    await waitFor(() => {
      expect(screen.queryByText('Preview')).not.toBeInTheDocument();
    });
  });

  test('Clear button resets the form', async () => {
    render(<AdminAnnouncements />);

    fireEvent.change(screen.getByTestId('mdeditor'), { target: { value: 'Some content' } });
    fireEvent.change(screen.getByLabelText(/Start Date/i), { target: { value: '2026-05-01T10:00' } });

    fireEvent.click(screen.getByRole('button', { name: /Clear/i }));

    await waitFor(() => {
      expect(screen.getByTestId('mdeditor')).toHaveValue('');
    });
  });
});
