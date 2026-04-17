import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockGetHistoricalMCQs = jest.fn();
const mockUseRequireRole = jest.fn();

jest.mock('@/utils/get-epa-data', () => ({
  getHistoricalMCQs: () => mockGetHistoricalMCQs(),
}));

jest.mock('@/utils/useRequiredRole', () => ({
  useRequireRole: (...args: unknown[]) => mockUseRequireRole(...args),
}));

jest.mock('@/components/loading', () => ({
  __esModule: true,
  default: () => <div data-testid='loading-indicator'>Loading...</div>,
}));

jest.mock('@/app/dashboard/admin/edit-questions-options/edit-modal-option', () => ({
  __esModule: true,
  default: ({ optionText, newOptionText }: any) => (
    <div data-testid='edit-option-modal'>
      <input id='new-option' defaultValue='' readOnly />
      <input id='new-option' defaultValue='' readOnly />
      <span data-testid='option-text'>{optionText.get ?? ''}</span>
      <span data-testid='new-option-text'>{newOptionText.get ?? ''}</span>
    </div>
  ),
}));

jest.mock('@/app/dashboard/admin/edit-questions-options/edit-modal-question', () => ({
  __esModule: true,
  default: ({ newQuestionText }: any) => (
    <div data-testid='edit-question-modal'>
      <textarea id='new-question' defaultValue='' readOnly />
      <textarea id='new-question' defaultValue='' readOnly />
      <span data-testid='new-question-text'>{newQuestionText.get ?? ''}</span>
    </div>
  ),
}));

jest.mock('@/app/dashboard/admin/edit-questions-options/question-list-item', () => ({
  __esModule: true,
  default: ({ mcq, handleOptionClick, handleQuestionClick, i }: any) => (
    <div data-testid={`question-item-${i}`}>
      <button onClick={() => handleQuestionClick(mcq)}>question-click</button>
      <button onClick={() => handleOptionClick(mcq, 'A', 'Option A')}>option-click</button>
      <span>{mcq.question}</span>
    </div>
  ),
}));

import QuestionList from '@/app/dashboard/admin/edit-questions-options/question-list';

describe('question-list.tsx coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses role guard and shows loading when historical MCQs are null', async () => {
    mockGetHistoricalMCQs.mockResolvedValueOnce(null);

    render(<QuestionList />);

    expect(mockUseRequireRole).toHaveBeenCalledWith(['admin', 'dev']);
    await waitFor(() => {
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });
  });

  it('shows loading when MCQ list is empty', async () => {
    mockGetHistoricalMCQs.mockResolvedValueOnce([]);

    render(<QuestionList />);

    await waitFor(() => {
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });
  });

  it('shows loading when first row has no data field', async () => {
    mockGetHistoricalMCQs.mockResolvedValueOnce([{ data: null }]);

    render(<QuestionList />);

    await waitFor(() => {
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });
  });

  it('renders accordion items and handles option/question click side effects', async () => {
    const mcq = {
      epa: '1',
      kf: '1.1',
      question: 'Clinical question text',
      opt_count: 2,
      options: { A: 'Option A' },
    };

    mockGetHistoricalMCQs.mockResolvedValueOnce([{ data: [mcq] }]);

    render(<QuestionList />);

    await waitFor(() => {
      expect(screen.getByTestId('question-item-0')).toBeInTheDocument();
      expect(screen.getByText('Clinical question text')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'option-click' }));

    expect(screen.getByTestId('option-text')).toHaveTextContent('Option A');
    expect(screen.getByTestId('new-option-text')).toHaveTextContent('Option A');

    const optionInputs = document.querySelectorAll('input[id="new-option"]') as NodeListOf<HTMLInputElement>;
    expect(optionInputs.length).toBe(2);
    expect(optionInputs[0].value).toBe('Option A');
    expect(optionInputs[1].value).toBe('Option A');

    fireEvent.click(screen.getByRole('button', { name: 'question-click' }));

    expect(screen.getByTestId('new-question-text')).toHaveTextContent('Clinical question text');
    const questionInputs = document.querySelectorAll('textarea[id="new-question"]') as NodeListOf<HTMLTextAreaElement>;
    expect(questionInputs.length).toBe(2);
    expect(questionInputs[0].value).toBe('Clinical question text');
    expect(questionInputs[1].value).toBe('Clinical question text');
  });
});
