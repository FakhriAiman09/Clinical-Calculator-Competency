import { beforeEach, describe, expect, jest, test } from '@jest/globals';

// This file unit-tests auth server actions with mocked Supabase responses.

const signInWithPasswordMock = jest.fn() as jest.Mock<any>;
const signUpMock = jest.fn() as jest.Mock<any>;
const resetPasswordForEmailMock = jest.fn() as jest.Mock<any>;
const signOutMock = jest.fn() as jest.Mock<any>;

const loggerErrorMock = jest.fn() as jest.Mock<any>;

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: {
      signInWithPassword: signInWithPasswordMock,
      signUp: signUpMock,
      resetPasswordForEmail: resetPasswordForEmailMock,
      signOut: signOutMock,
    },
  })),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    error: loggerErrorMock,
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import { forgotPassword, login, logout, signup } from '../../frontend/src/app/login/actions';

describe('Auth action unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_BASE_URL;
  });

  // Ensures login returns success and calls Supabase with exact credentials.
  test('login succeeds with valid credentials', async () => {
    signInWithPasswordMock.mockResolvedValueOnce({ error: null });

    const formData = new FormData();
    formData.append('email', 'student@example.com');
    formData.append('password', 'correct-pass');

    const result = await login(formData);

    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: 'student@example.com',
      password: 'correct-pass',
    });
    expect(result).toEqual({ alertColor: 'success', error: '' });
  });

  // Ensures invalid credentials map to a user-friendly error.
  test('login returns invalid email/password message for invalid_credentials', async () => {
    const authError = { code: 'invalid_credentials', message: 'Invalid login credentials' };
    signInWithPasswordMock.mockResolvedValueOnce({ error: authError });

    const formData = new FormData();
    formData.append('email', 'wrong@example.com');
    formData.append('password', 'wrong-pass');

    const result = await login(formData);

    expect(result).toEqual({ alertColor: 'danger', error: 'Invalid email or password.' });
  });

  // Ensures unverified accounts receive the proper warning path.
  test('login returns verify-email message for email_not_confirmed', async () => {
    const authError = { code: 'email_not_confirmed', message: 'Email not confirmed' };
    signInWithPasswordMock.mockResolvedValueOnce({ error: authError });

    const formData = new FormData();
    formData.append('email', 'newuser@example.com');
    formData.append('password', 'any-pass');

    const result = await login(formData);

    expect(result).toEqual({
      alertColor: 'warning',
      error: 'Please verify your email. Check your spam folder.',
    });
  });

  // Ensures unknown auth errors are logged and surfaced with code/message.
  test('login returns code+message for unknown auth errors', async () => {
    const authError = { code: 'rate_limit', message: 'Too many requests' };
    signInWithPasswordMock.mockResolvedValueOnce({ error: authError });

    const formData = new FormData();
    formData.append('email', 'user@example.com');
    formData.append('password', 'pass12345');

    const result = await login(formData);

    expect(loggerErrorMock).toHaveBeenCalled();
    expect(result).toEqual({ alertColor: 'danger', error: 'rate_limit: Too many requests' });
  });

  // Ensures non-AuthError failures fall back to generic warning text.
  test('login returns generic warning for non-auth errors', async () => {
    signInWithPasswordMock.mockRejectedValueOnce(new Error('Unexpected crash'));

    const formData = new FormData();
    formData.append('email', 'user@example.com');
    formData.append('password', 'pass12345');

    const result = await login(formData);

    expect(result).toEqual({ alertColor: 'warning', error: 'Something went wrong.' });
  });

  // Ensures signup returns success when Supabase reports no error.
  test('signup succeeds with valid input', async () => {
    signUpMock.mockResolvedValueOnce({ error: null });

    const formData = new FormData();
    formData.append('email', 'new@example.com');
    formData.append('password', 'strongpass');

    const result = await signup(formData);

    expect(signUpMock).toHaveBeenCalledWith({ email: 'new@example.com', password: 'strongpass' });
    expect(result).toEqual({ alertColor: 'success', error: '' });
  });

  // Ensures signup propagates AuthError details for debugging/user feedback.
  test('signup returns auth error details when Supabase rejects signup', async () => {
    const authError = { code: 'weak_password', message: 'Password should be at least 6 characters' };
    signUpMock.mockResolvedValueOnce({ error: authError });

    const formData = new FormData();
    formData.append('email', 'new@example.com');
    formData.append('password', '123');

    const result = await signup(formData);

    expect(result).toEqual({
      alertColor: 'danger',
      error: 'weak_password: Password should be at least 6 characters',
    });
  });

  // Ensures signup handles non-auth failures safely.
  test('signup returns generic warning for non-auth errors', async () => {
    signUpMock.mockRejectedValueOnce(new Error('Unexpected crash'));

    const formData = new FormData();
    formData.append('email', 'new@example.com');
    formData.append('password', 'strongpass');

    const result = await signup(formData);

    expect(result).toEqual({ alertColor: 'warning', error: 'Something went wrong.' });
  });

  // Ensures forgotPassword rejects invalid email before contacting Supabase.
  test('forgotPassword rejects invalid email format', async () => {
    const formData = new FormData();
    formData.append('email', 'not-an-email');

    const result = await forgotPassword(formData);

    expect(resetPasswordForEmailMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      alertColor: 'danger',
      message: 'Please enter a valid email address.',
    });
  });

  // Ensures forgotPassword sends reset with redirect URL when app URL is configured.
  test('forgotPassword uses redirectTo when NEXT_PUBLIC_APP_URL exists', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    resetPasswordForEmailMock.mockResolvedValueOnce({ error: null });

    const formData = new FormData();
    formData.append('email', 'student@example.com');

    const result = await forgotPassword(formData);

    expect(resetPasswordForEmailMock).toHaveBeenCalledWith('student@example.com', {
      redirectTo: 'https://app.example.com/login?reset=true',
    });
    expect(result).toEqual({
      alertColor: 'success',
      message: 'Password reset email sent! Check your inbox (and spam folder).',
    });
  });

  // Ensures forgotPassword can still run without a configured base URL.
  test('forgotPassword omits redirectTo when no base URL is configured', async () => {
    resetPasswordForEmailMock.mockResolvedValueOnce({ error: null });

    const formData = new FormData();
    formData.append('email', 'student@example.com');

    const result = await forgotPassword(formData);

    expect(resetPasswordForEmailMock).toHaveBeenCalledWith('student@example.com', {});
    expect(result.alertColor).toBe('success');
  });

  // Ensures forgotPassword surfaces Supabase AuthError message and logs it.
  test('forgotPassword returns auth error message on Supabase auth failure', async () => {
    const authError = { code: 'over_email_send_rate_limit', message: 'Email rate limit exceeded' };
    resetPasswordForEmailMock.mockResolvedValueOnce({ error: authError });

    const formData = new FormData();
    formData.append('email', 'student@example.com');

    const result = await forgotPassword(formData);

    expect(loggerErrorMock).toHaveBeenCalled();
    expect(result).toEqual({
      alertColor: 'danger',
      message: 'Email rate limit exceeded',
    });
  });

  // Ensures forgotPassword handles unexpected runtime failures gracefully.
  test('forgotPassword returns generic warning for non-auth failures', async () => {
    resetPasswordForEmailMock.mockRejectedValueOnce(new Error('Timeout'));

    const formData = new FormData();
    formData.append('email', 'student@example.com');

    const result = await forgotPassword(formData);

    expect(result).toEqual({
      alertColor: 'warning',
      message: 'Something went wrong. Please try again.',
    });
  });

  // Ensures logout forwards to Supabase signOut.
  test('logout calls Supabase signOut', async () => {
    signOutMock.mockResolvedValueOnce({ error: null });

    await logout();

    expect(signOutMock).toHaveBeenCalledTimes(1);
  });
});
