import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const pushMock = jest.fn();
const replaceMock = jest.fn();
const getSearchParamMock = jest.fn();
const loginMock = jest.fn();
const signupMock = jest.fn();
const forgotPasswordMock = jest.fn();
const getSessionMock = jest.fn();
const onAuthStateChangeMock = jest.fn();
const updateUserMock = jest.fn();

let authStateChangeCallback: ((event: string) => void) | null = null;

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, ...props }: { alt: string }) => <img alt={alt} {...props} />,
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: pushMock, replace: replaceMock })),
  useSearchParams: jest.fn(() => ({ get: (key: string) => getSearchParamMock(key) })),
}));

jest.mock('@/components/ccc-logo-color.svg', () => 'mock-logo.svg');

jest.mock('@/app/login/actions', () => ({
  login: (...args: unknown[]) => loginMock(...args),
  signup: (...args: unknown[]) => signupMock(...args),
  forgotPassword: (...args: unknown[]) => forgotPasswordMock(...args),
}));

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
      onAuthStateChange: (...args: unknown[]) => onAuthStateChangeMock(...args),
      updateUser: (...args: unknown[]) => updateUserMock(...args),
    },
  })),
}));

import LoginPage from '@/app/login/page';

function renderPage() {
  const rendered = render(<LoginPage />);
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const form = document.getElementById('login-form') as HTMLFormElement | null;
  emailInput?.setAttribute('name', 'email');
  passwordInput?.setAttribute('name', 'password');
  if (form && emailInput && passwordInput) {
    Object.defineProperty(form, 'email', { configurable: true, value: emailInput });
    Object.defineProperty(form, 'password', { configurable: true, value: passwordInput });
  }
  return rendered;
}

function fillCredentials(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
}

describe('login page coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    authStateChangeCallback = null;
    getSearchParamMock.mockReturnValue(null);
    loginMock.mockResolvedValue({ alertColor: 'success', error: '' });
    signupMock.mockResolvedValue({ alertColor: 'success', error: '' });
    forgotPasswordMock.mockResolvedValue({ alertColor: 'success', message: 'Reset email sent' });
    getSessionMock.mockResolvedValue({ data: { session: null } });
    updateUserMock.mockResolvedValue({ error: null });
    onAuthStateChangeMock.mockImplementation((callback: (event: string) => void) => {
      authStateChangeCallback = callback;
      return {
        data: { subscription: { unsubscribe: jest.fn() } },
      };
    });
    Storage.prototype.clear.call(localStorage);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders login form and toggles password visibility', async () => {
    renderPage();

    expect(screen.getByText('Clinical Competency Calculator')).toBeInTheDocument();
    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    fireEvent.click(screen.getByLabelText('Show password'));
    expect(passwordInput.type).toBe('text');
    fireEvent.click(screen.getByLabelText('Hide password'));
    expect(passwordInput.type).toBe('password');
  });

  it('shows validation feedback for invalid login input', async () => {
    renderPage();

    fillCredentials('bad', 'short');
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toHaveClass('is-invalid');
      expect(screen.getByLabelText('Password')).toHaveClass('is-invalid');
    });
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('handles successful login with redirectTo query param', async () => {
    const reloadMock = jest.fn();
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    });
    getSearchParamMock.mockImplementation((key: string) => (key === 'redirectTo' ? '/target' : null));

    renderPage();
    fillCredentials('user@example.com', 'password123');
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalled();
      expect(setItemSpy).toHaveBeenCalledWith('redirectTo', '/target');
      expect(reloadMock).toHaveBeenCalled();
    });
  });

  it('handles successful signup and redirects to verification page', async () => {
    renderPage();
    fillCredentials('new@example.com', 'password123');
    fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));

    await waitFor(() => {
      expect(signupMock).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith('/postsignup/verify');
    });
  });

  it('shows auth error returned from login action', async () => {
    loginMock.mockResolvedValue({ alertColor: 'danger', error: 'Invalid email or password.' });
    renderPage();

    fillCredentials('user@example.com', 'password123');
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
    });
  });

  it('redirects existing session user to dashboard', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    renderPage();

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('opens reset modal when reset query is present with active session', async () => {
    getSearchParamMock.mockImplementation((key: string) => (key === 'reset' ? 'true' : null));
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Set a new password')).toBeInTheDocument();
    });
  });

  it('opens reset modal when auth state changes to PASSWORD_RECOVERY', async () => {
    renderPage();

    act(() => {
      authStateChangeCallback?.('PASSWORD_RECOVERY');
    });

    expect(screen.getByText('Set a new password')).toBeInTheDocument();
  });

  it('redirects using localStorage redirect flags', async () => {
    localStorage.setItem('redirectToDashboard', 'true');
    localStorage.setItem('redirectTo', '/saved-path');

    renderPage();

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/saved-path');
      expect(localStorage.getItem('redirectTo')).toBeNull();
      expect(localStorage.getItem('redirectToDashboard')).toBeNull();
    });
  });

  it('opens forgot password modal and handles success flow', async () => {
    renderPage();

    fireEvent.click(screen.getByText('Forgot password?'));
    expect(screen.getByText('Reset your password')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Email' }));

    await waitFor(() => {
      expect(forgotPasswordMock).toHaveBeenCalled();
      expect(screen.getByText('Reset email sent')).toBeInTheDocument();
    });
  });

  it('closes forgot password modal from backdrop and close button', async () => {
    renderPage();
    fireEvent.click(screen.getByText('Forgot password?'));

    fireEvent.click(screen.getByLabelText('Close password reset modal'));
    await waitFor(() => expect(screen.queryByText('Reset your password')).toBeNull());

    fireEvent.click(screen.getByText('Forgot password?'));
    fireEvent.click(screen.getByLabelText('Close'));
    await waitFor(() => expect(screen.queryByText('Reset your password')).toBeNull());
  });

  it('shows reset password validation errors', async () => {
    getSearchParamMock.mockImplementation((key: string) => (key === 'reset' ? 'true' : null));
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    renderPage();

    await waitFor(() => expect(screen.getByText('Set a new password')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/at least 8 characters/i);

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match.');
  });

  it('shows reset password server error', async () => {
    getSearchParamMock.mockImplementation((key: string) => (key === 'reset' ? 'true' : null));
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    updateUserMock.mockResolvedValue({ error: { message: 'Update failed' } });
    renderPage();

    await waitFor(() => expect(screen.getByText('Set a new password')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });
  });

  it('resets password successfully and navigates back to login', async () => {
    getSearchParamMock.mockImplementation((key: string) => (key === 'reset' ? 'true' : null));
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    renderPage();

    await waitFor(() => expect(screen.getByText('Set a new password')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));

    await waitFor(() => {
      expect(screen.getByText(/Password updated/i)).toBeInTheDocument();
    });

    act(() => {
      jest.advanceTimersByTime(1300);
    });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/login');
    });
  });
});