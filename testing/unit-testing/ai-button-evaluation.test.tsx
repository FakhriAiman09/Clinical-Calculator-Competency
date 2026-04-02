import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';

// Simple AI Evaluation Component
const AIEvaluationButton: React.FC<{
  commentText: string;
  onUpdate: (text: string) => void;
}> = ({ commentText, onUpdate }) => {
  const [summary, setSummary] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const generateSummary = async () => {
    if (!commentText.trim()) {
      setError('Please enter comment text first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Simulate API call
      const response = await fetch('/api/ai-summary', {
        method: 'POST',
        body: JSON.stringify({ text: commentText }),
      });

      if (!response.ok) throw new Error('Failed to generate summary');

      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      setError('Error generating summary');
    } finally {
      setLoading(false);
    }
  };

  const insertSummary = () => {
    if (!summary) return;
    onUpdate(commentText + '\n' + summary);
    setSummary('');
  };

  const replaceSummary = () => {
    if (!summary) return;
    onUpdate(summary);
    setSummary('');
  };

  return (
    <div>
      <button
        onClick={generateSummary}
        disabled={loading}
        data-testid="ai-button"
        title="Generate AI summary"
      >
        {loading ? 'Generating...' : '✨ AI Summary'}
      </button>

      {error && (
        <div data-testid="error-message" style={{ color: 'red' }}>
          {error}
        </div>
      )}

      {summary && (
        <div data-testid="summary-box" style={{ border: '1px solid #ccc', padding: '10px', marginTop: '10px' }}>
          <p style={{ fontSize: '12px', color: '#666' }}>Summary:</p>
          <p data-testid="summary-text">{summary}</p>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              onClick={insertSummary}
              data-testid="insert-button"
            >
              Insert
            </button>
            <button
              onClick={replaceSummary}
              data-testid="replace-button"
            >
              Replace
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Tests
describe('AI Button Evaluation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock fetch
    global.fetch = jest.fn();
  });

  test('should render AI button', () => {
    render(
      <AIEvaluationButton
        commentText="Test comment"
        onUpdate={jest.fn()}
      />
    );

    expect(screen.getByTestId('ai-button')).toBeInTheDocument();
    expect(screen.getByTestId('ai-button')).toHaveTextContent('AI Summary');
  });

  test('should show error if no comment text', async () => {
    render(
      <AIEvaluationButton
        commentText=""
        onUpdate={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('ai-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Please enter comment text first');
    });
  });

  test('should generate summary on button click', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: 'Student demonstrated excellent clinical reasoning and patient management skills.',
      }),
    });

    render(
      <AIEvaluationButton
        commentText="Student showed great clinical skills during evaluation"
        onUpdate={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('ai-button'));

    await waitFor(() => {
      expect(screen.getByTestId('summary-box')).toBeInTheDocument();
      expect(screen.getByTestId('summary-text')).toHaveTextContent(
        'Student demonstrated excellent clinical reasoning and patient management skills.'
      );
    });
  });

  test('should show loading state while generating', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise((resolve) =>
        setTimeout(() =>
          resolve({
            ok: true,
            json: async () => ({ summary: 'Test summary' }),
          }),
          100
        )
      )
    );

    render(
      <AIEvaluationButton
        commentText="Test comment"
        onUpdate={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('ai-button'));

    expect(screen.getByTestId('ai-button')).toHaveTextContent('Generating...');
    expect(screen.getByTestId('ai-button')).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByTestId('ai-button')).toHaveTextContent('AI Summary');
      expect(screen.getByTestId('ai-button')).not.toBeDisabled();
    });
  });

  test('should display insert and replace buttons when summary is generated', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: 'AI generated summary',
      }),
    });

    render(
      <AIEvaluationButton
        commentText="Original comment"
        onUpdate={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('ai-button'));

    await waitFor(() => {
      expect(screen.getByTestId('insert-button')).toBeInTheDocument();
      expect(screen.getByTestId('replace-button')).toBeInTheDocument();
    });
  });

  test('should insert summary keeping original comment', async () => {
    const mockOnUpdate = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: 'AI summary text',
      }),
    });

    render(
      <AIEvaluationButton
        commentText="Original comment text"
        onUpdate={mockOnUpdate}
      />
    );

    fireEvent.click(screen.getByTestId('ai-button'));

    await waitFor(() => {
      expect(screen.getByTestId('insert-button')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('insert-button'));

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith('Original comment text\nAI summary text');
    });
  });

  test('should replace with summary only', async () => {
    const mockOnUpdate = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: 'AI summary only',
      }),
    });

    render(
      <AIEvaluationButton
        commentText="Original comment text will be replaced"
        onUpdate={mockOnUpdate}
      />
    );

    fireEvent.click(screen.getByTestId('ai-button'));

    await waitFor(() => {
      expect(screen.getByTestId('replace-button')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('replace-button'));

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith('AI summary only');
    });
  });

  test('should clear summary after insert', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: 'Test summary',
      }),
    });

    render(
      <AIEvaluationButton
        commentText="Test comment"
        onUpdate={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('ai-button'));

    await waitFor(() => {
      expect(screen.getByTestId('summary-box')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('insert-button'));

    await waitFor(() => {
      expect(screen.queryByTestId('summary-box')).not.toBeInTheDocument();
    });
  });

  test('should clear summary after replace', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: 'Test summary',
      }),
    });

    render(
      <AIEvaluationButton
        commentText="Test comment"
        onUpdate={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('ai-button'));

    await waitFor(() => {
      expect(screen.getByTestId('summary-box')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('replace-button'));

    await waitFor(() => {
      expect(screen.queryByTestId('summary-box')).not.toBeInTheDocument();
    });
  });

  test('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(
      <AIEvaluationButton
        commentText="Test comment"
        onUpdate={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('ai-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Error generating summary');
    });
  });

  test('should handle multiple summary generations', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: 'Fresh AI summary',
      }),
    });

    render(
      <AIEvaluationButton
        commentText="Comment for summary"
        onUpdate={jest.fn()}
      />
    );

    // First generation
    fireEvent.click(screen.getByTestId('ai-button'));

    await waitFor(() => {
      expect(screen.getByTestId('summary-text')).toHaveTextContent('Fresh AI summary');
    });

    // Close summary
    fireEvent.click(screen.getByTestId('insert-button'));

    await waitFor(() => {
      expect(screen.queryByTestId('summary-box')).not.toBeInTheDocument();
    });

    // Second generation
    fireEvent.click(screen.getByTestId('ai-button'));

    await waitFor(() => {
      expect(screen.getByTestId('summary-text')).toHaveTextContent('Fresh AI summary');
    });
  });

  test('should work with clinical assessment text', async () => {
    const clinicalText = 'Student demonstrated excellent clinical reasoning during patient assessment and provided appropriate management recommendations.';
    const mockOnUpdate = jest.fn();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: 'Clinical competency validated. Student shows strong assessment skills.',
      }),
    });

    render(
      <AIEvaluationButton
        commentText={clinicalText}
        onUpdate={mockOnUpdate}
      />
    );

    fireEvent.click(screen.getByTestId('ai-button'));

    await waitFor(() => {
      expect(screen.getByTestId('summary-text')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('insert-button'));

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        clinicalText + '\nClinical competency validated. Student shows strong assessment skills.'
      );
    });
  });
});
