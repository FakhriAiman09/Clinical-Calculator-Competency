import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockInsert = jest.fn();
const mockFrom = jest.fn(() => ({
  insert: mockInsert,
}));

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

const mockUseUser = jest.fn();
jest.mock('@/context/UserContext', () => ({
  useUser: () => mockUseUser(),
}));

const mockHandleSubmit = jest.fn(async () => undefined);
const mockUseEditModalController = jest.fn(() => ({
  accordionID: 'accordion-1',
  handleSubmit: mockHandleSubmit,
  history: [],
  loadingHistory: false,
}));

jest.mock('@/app/dashboard/admin/edit-questions-options/utils', () => ({
  useEditModalController: (...args: unknown[]) => mockUseEditModalController(...args),
}));

const mockSubmitNewOption = jest.fn(async () => undefined);
const mockGetUpdaterDetails = jest.fn(async () => ({ id: 'u1', display_name: 'User', email: 'u@x.com' }));

jest.mock('@/app/dashboard/admin/edit-questions-options/actions', () => ({
  submitNewOption: (...args: unknown[]) => mockSubmitNewOption(...args),
  getUpdaterDetails: (...args: unknown[]) => mockGetUpdaterDetails(...args),
}));

import DeveloperTicketModal from '@/components/DevTicketsModal';
import EditModalChangesList from '@/app/dashboard/admin/edit-questions-options/edit-modal-changes-list';
import EditModalLayout from '@/app/dashboard/admin/edit-questions-options/edit-modal-layout';
import EditOptionModal from '@/app/dashboard/admin/edit-questions-options/edit-modal-option';
import QuestionItem from '@/app/dashboard/admin/edit-questions-options/question-list-item';

describe('DeveloperTicketModal coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({ user: { id: 'user-1' } });
    mockInsert.mockResolvedValue({ error: null });
  });

  test('renders nothing when hidden and no toast exists', () => {
    const { container } = render(<DeveloperTicketModal show={false} onClose={() => undefined} />);
    expect(container.firstChild).toBeNull();
  });

  test('adds modal-open class while visible and removes when hidden', () => {
    const { rerender } = render(<DeveloperTicketModal show={true} onClose={() => undefined} />);
    expect(document.body.classList.contains('modal-open')).toBe(true);

    rerender(<DeveloperTicketModal show={false} onClose={() => undefined} />);
    expect(document.body.classList.contains('modal-open')).toBe(false);
  });

  test('submits a ticket successfully', async () => {
    render(<DeveloperTicketModal show={true} onClose={() => undefined} />);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'My bug title' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Steps to reproduce bug' } });
    fireEvent.change(screen.getByLabelText('Ticket Type'), { target: { value: 'issue' } });

    fireEvent.click(screen.getByRole('button', { name: 'Submit Ticket' }));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('developer_tickets');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My bug title',
          description: 'Steps to reproduce bug',
          type: 'issue',
          status: 'open',
          submitted_by: 'user-1',
        }),
      );
    });

    expect(screen.getByText('✅ Ticket submitted!')).toBeInTheDocument();
  });

  test('shows error toast when insert fails', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'insert failed' } });

    render(<DeveloperTicketModal show={true} onClose={() => undefined} />);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Bad path' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'desc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Ticket' }));

    expect(await screen.findByText('insert failed')).toBeInTheDocument();
  });

  test('cancel calls onClose', () => {
    const onClose = jest.fn();
    render(<DeveloperTicketModal show={true} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Edit modal component coverage', () => {
  test('EditModalChangesList shows loading indicator', () => {
    render(
      <EditModalChangesList
        changesLabel='option'
        loadingHistory={true}
        history={null}
        useID='acc-1'
      />, 
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('EditModalChangesList shows no history message', () => {
    render(
      <EditModalChangesList
        changesLabel='question'
        loadingHistory={false}
        history={[]}
        useID='acc-2'
      />,
    );

    expect(screen.getByText('No changes found.')).toBeInTheDocument();
  });

  test('EditModalChangesList renders history entries with updater fallback', () => {
    const hist = [
      {
        updated_at: new Date('2026-04-01'),
        updated_by: 'u1',
        updater_display_name: null,
        updater_email: 'u1@example.com',
        text: 'Updated option text',
      },
    ];

    render(
      <EditModalChangesList
        changesLabel='option'
        loadingHistory={false}
        history={hist}
        useID='acc-3'
      />,
    );

    expect(screen.getByText('Updated option text')).toBeInTheDocument();
    expect(screen.getByText(/by u1@example.com/i)).toBeInTheDocument();
  });

  test('EditModalLayout renders children and submit button interaction', () => {
    const onSubmit = jest.fn();

    render(
      <EditModalLayout
        modal={{ id: 'm1', title: 'Edit something' }}
        changes={{ accordionID: 'acc-x', label: 'question', history: [], loading: false }}
        submit={{ disabled: false, onClick: onSubmit }}
      >
        <div>Inner content</div>
      </EditModalLayout>,
    );

    expect(screen.getByText('Edit something')).toBeInTheDocument();
    expect(screen.getByText('Inner content')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save changes', hidden: true }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  test('EditOptionModal renders and propagates submit state', () => {
    const optionMCQ = {
      get: { epa: '1', kf: '1.1', opt_count: 2, options: { A: 'Alpha' }, question: 'Question?' },
      set: jest.fn(),
    };

    const optionKey = { get: 'A', set: jest.fn() };
    const optionText = { get: 'Alpha', set: jest.fn() };
    const newOptionText = { get: 'Beta', set: jest.fn() };
    const mcqsInformation = { get: [], set: jest.fn() };

    render(
      <EditOptionModal
        mcqsInformation={mcqsInformation as never}
        optionMCQ={optionMCQ as never}
        optionKey={optionKey as never}
        optionText={optionText as never}
        newOptionText={newOptionText as never}
      />,
    );

    expect(screen.getByText('Edit option')).toBeInTheDocument();
    expect(screen.getByText('Old option:')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Option text'), { target: { value: 'Gamma' } });
    expect(newOptionText.set).toHaveBeenCalledWith('Gamma');
  });

  test('QuestionItem renders options and calls handlers', () => {
    const mcq = {
      epa: '1',
      kf: '1.1',
      opt_count: 2,
      question: 'Clinical question',
      options: { A: 'Option A', B: 'Option B' },
    };

    const onOptionClick = jest.fn();
    const onQuestionClick = jest.fn();

    render(
      <div id='question-list'>
        <QuestionItem
          i={0}
          mcq={mcq}
          handleOptionClick={onOptionClick}
          handleQuestionClick={onQuestionClick}
        />
      </div>,
    );

    expect(screen.getByText('Clinical question')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Edit question/i }));
    expect(onQuestionClick).toHaveBeenCalledWith(mcq);

    const pencilButtons = screen.getAllByRole('button');
    fireEvent.click(pencilButtons[pencilButtons.length - 1]);
    expect(onOptionClick).toHaveBeenCalled();
  });
});
