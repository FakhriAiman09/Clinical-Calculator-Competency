import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// Simple Forgot Password Component
const ForgotPasswordComponent: React.FC<{
  onSuccess?: () => void;
}> = ({ onSuccess }) => {
  const [email, setEmail] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Email validation
    if (!email) {
      setError('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Invalid email format');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to send reset email');
      }

      setMessage('Reset link sent to your email. Check your inbox.');
      setEmail('');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Forgot Password</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Email:
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="email-input"
              placeholder="Enter your email"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          data-testid="submit-button"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      {error && (
        <div data-testid="error-message" style={{ color: 'red', marginTop: '10px' }}>
          {error}
        </div>
      )}

      {message && (
        <div data-testid="success-message" style={{ color: 'green', marginTop: '10px' }}>
          {message}
        </div>
      )}
    </div>
  );
};

// Tests
describe('Forgot Password Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  test('should render forgot password form', () => {
    render(<ForgotPasswordComponent />);
    expect(screen.getByText('Forgot Password')).toBeInTheDocument();
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('submit-button')).toBeInTheDocument();
  });

  test('should show error if email is empty', async () => {
    render(<ForgotPasswordComponent />);
    fireEvent.click(screen.getByTestId('submit-button'));
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Email is required');
    });
  });

  test('should show error for invalid email format', async () => {
    render(<ForgotPasswordComponent />);
    fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'invalid-email' } });
    fireEvent.click(screen.getByTestId('submit-button'));
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Invalid email format');
    });
  });

  test('should show success message on valid email', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Email sent' }),
    });

    render(<ForgotPasswordComponent />);
    fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('success-message')).toHaveTextContent('Reset link sent to your email');
    });
  });

  test('should show loading state while sending', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise((resolve) =>
        setTimeout(() => resolve({ ok: true, json: async () => ({ message: 'Email sent' }) }), 100)
      )
    );

    render(<ForgotPasswordComponent />);
    fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByTestId('submit-button'));

    expect(screen.getByTestId('submit-button')).toHaveTextContent('Sending...');
    expect(screen.getByTestId('submit-button')).toBeDisabled();
  });

  test('should handle API errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'User not found' }),
    });

    render(<ForgotPasswordComponent />);
    fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'notfound@example.com' } });
    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('User not found');
    });
  });

  test('should handle network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<ForgotPasswordComponent />);
    fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Network error');
    });
  });
});
