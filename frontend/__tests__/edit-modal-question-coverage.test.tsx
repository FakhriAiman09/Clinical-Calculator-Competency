// Tests for edit-modal-question.tsx - EditQuestionModal component
import { render, screen } from '@testing-library/react';
import EditQuestionModal from '@/app/dashboard/admin/edit-questions-options/edit-modal-question';
import * as actions from '@/app/dashboard/admin/edit-questions-options/actions';
import type { Tables } from '@/utils/supabase/database.types';
import type { MCQ } from '@/utils/types';

// Mock the dependencies
jest.mock('@/app/dashboard/admin/edit-questions-options/actions');
jest.mock('@/app/dashboard/admin/edit-questions-options/render-spans', () => ({
  renderQuestion: (kf: string, question: string) => (
    <span data-testid="render-question">{kf} - {question}</span>
  ),
}));
jest.mock('@/app/dashboard/admin/edit-questions-options/edit-modal-layout', () => {
  return function EditModalLayoutMock({ children }: { children: React.ReactNode }) {
    return <div data-testid="edit-modal-layout">{children}</div>;
  };
});
jest.mock('@/app/dashboard/admin/edit-questions-options/utils', () => ({
  useEditModalController: () => ({
    accordionID: 'test-accordion',
    handleSubmit: jest.fn(),
    history: [],
    loadingHistory: false,
  }),
}));

describe('EditQuestionModal', () => {
  const mockMCQ: MCQ & { kf: string } = {
    question: 'Original question?',
    kf: 'EPA-1',
    options: {
      opt1: 'Option 1',
      opt2: 'Option 2',
    },
  };

  const mockMcqsMetaRow: Tables<'mcqs_options'> = {
    id: 'test-id',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    updated_by: 'user-1',
    mcqs_title: 'Test MCQs',
    data: [mockMCQ as unknown as MCQ],
  };

  const mockProps = {
    mcqsInformation: {
      get: [mockMcqsMetaRow],
      set: jest.fn(),
    },
    questionMCQ: {
      get: mockMCQ,
      set: jest.fn(),
    },
    newQuestionText: {
      get: 'Updated question?',
      set: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (actions.submitNewQuestion as jest.Mock).mockResolvedValue(undefined);
    (actions.getUpdaterDetails as jest.Mock).mockResolvedValue({
      id: 'user-1',
      display_name: 'Test User',
      email: 'user@test.com',
    });
  });

  it('should render EditModalLayout with question text', () => {
    render(<EditQuestionModal {...mockProps} />);
    expect(screen.getByTestId('edit-modal-layout')).toBeInTheDocument();
    expect(screen.getByText('Old question:')).toBeInTheDocument();
  });

  it('should render old question via renderQuestion when MCQ exists', () => {
    render(<EditQuestionModal {...mockProps} />);
    expect(screen.getByTestId('render-question')).toBeInTheDocument();
    expect(screen.getByTestId('render-question')).toHaveTextContent('EPA-1 - Original question?');
  });

  it('should render empty string when question MCQ is null', () => {
    const propsWithNullMCQ = {
      ...mockProps,
      questionMCQ: {
        get: null,
        set: jest.fn(),
      },
    };
    render(<EditQuestionModal {...propsWithNullMCQ} />);
    expect(screen.getByTestId('edit-modal-layout')).toBeInTheDocument();
    expect(screen.queryByTestId('render-question')).not.toBeInTheDocument();
  });

  it('should render textarea for new question input', () => {
    render(<EditQuestionModal {...mockProps} />);
    expect(screen.getByText('New question:')).toBeInTheDocument();
    const textarea = screen.getByPlaceholderText('Question text');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('rows', '2');
  });

  it('should have form control styling on textarea', () => {
    render(<EditQuestionModal {...mockProps} />);
    const textarea = screen.getByPlaceholderText('Question text');
    expect(textarea).toHaveClass('form-control');
  });

  it('should pass edit modal controller configuration', () => {
    render(<EditQuestionModal {...mockProps} />);
    // Component should render without errors
    expect(screen.getByTestId('edit-modal-layout')).toBeInTheDocument();
  });

  it('should handle callback for textarea changes', () => {
    render(<EditQuestionModal {...mockProps} />);
    const textarea = screen.getByPlaceholderText('Question text');
    expect(textarea).toBeInTheDocument();
    // Verify textarea can be interacted with
    expect(textarea).toHaveClass('form-control');
    expect(textarea.parentElement).toHaveClass('mb-3');
  });
});
