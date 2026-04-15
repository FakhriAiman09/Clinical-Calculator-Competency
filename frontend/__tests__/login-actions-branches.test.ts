import { AuthError } from '@supabase/supabase-js';

const signInWithPasswordMock = jest.fn();
const signUpMock = jest.fn();
const resetPasswordForEmailMock = jest.fn();

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: {
      signInWithPassword: signInWithPasswordMock,
      signUp: signUpMock,
      resetPasswordForEmail: resetPasswordForEmailMock,
    },
  })),
}));

jest.mock('@/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { login, signup, forgotPassword } from '@/app/login/actions';

describe('login – additional branches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns success on valid credentials', async () => {
    signInWithPasswordMock.mockResolvedValueOnce({ error: null });

    const fd = new FormData();
    fd.append('email', 'user@example.com');
    fd.append('password', 'correct-password');

    const result = await login(fd);
    expect(result).toEqual({ alertColor: 'success', error: '' });
  });

  test('returns warning for email_not_confirmed error code', async () => {
    const authError = new AuthError('Email not confirmed');
    (authError as unknown as { code: string }).code = 'email_not_confirmed';
    signInWithPasswordMock.mockResolvedValueOnce({ error: authError });

    const fd = new FormData();
    fd.append('email', 'unverified@example.com');
    fd.append('password', 'any-pass');

    const result = await login(fd);
    expect(result).toEqual({
      alertColor: 'warning',
      error: 'Please verify your email. Check your spam folder.',
    });
  });

  test('returns danger with code:message for unknown auth error code', async () => {
    const authError = new AuthError('Something unexpected');
    (authError as unknown as { code: string }).code = 'unknown_code';
    signInWithPasswordMock.mockResolvedValueOnce({ error: authError });

    const fd = new FormData();
    fd.append('email', 'user@example.com');
    fd.append('password', 'pass');

    const result = await login(fd);
    expect(result).toEqual({
      alertColor: 'danger',
      error: 'unknown_code: Something unexpected',
    });
  });

  test('returns warning for non-AuthError thrown during login', async () => {
    signInWithPasswordMock.mockRejectedValueOnce(new TypeError('Network error'));

    const fd = new FormData();
    fd.append('email', 'user@example.com');
    fd.append('password', 'pass');

    const result = await login(fd);
    expect(result).toEqual({ alertColor: 'warning', error: 'Something went wrong.' });
  });
});

describe('signup', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('returns success when signUp succeeds', async () => {
    signUpMock.mockResolvedValueOnce({ error: null });

    const fd = new FormData();
    fd.append('email', 'new@example.com');
    fd.append('password', 'strongpassword');

    const result = await signup(fd);
    expect(result).toEqual({ alertColor: 'success', error: '' });
  });

  test('returns danger for auth error during signup', async () => {
    const authError = new AuthError('User already registered');
    (authError as unknown as { code: string }).code = 'user_already_exists';
    signUpMock.mockResolvedValueOnce({ error: authError });

    const fd = new FormData();
    fd.append('email', 'existing@example.com');
    fd.append('password', 'pass');

    const result = await signup(fd);
    expect(result.alertColor).toBe('danger');
  });
});

describe('forgotPassword – additional branches', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => { process.env = OLD_ENV; });

  test('returns danger when base URL env vars are all missing', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_BASE_URL;

    const fd = new FormData();
    fd.append('email', 'user@example.com');

    const result = await forgotPassword(fd);
    expect(result.alertColor).toBe('danger');
    expect(result.message).toMatch(/not configured/i);
  });

  test('returns success when reset email is sent', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
    resetPasswordForEmailMock.mockResolvedValueOnce({ error: null });

    const fd = new FormData();
    fd.append('email', 'user@example.com');

    const result = await forgotPassword(fd);
    expect(result).toEqual({
      alertColor: 'success',
      message: 'Password reset email sent. Check your inbox and spam folder.',
    });
  });

  test('returns danger with auth error message during password reset', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
    const authError = new AuthError('Rate limit exceeded');
    (authError as unknown as { code: string }).code = 'over_email_send_rate_limit';
    resetPasswordForEmailMock.mockResolvedValueOnce({ error: authError });

    const fd = new FormData();
    fd.append('email', 'user@example.com');

    const result = await forgotPassword(fd);
    expect(result.alertColor).toBe('danger');
    expect(result.message).toBe('Rate limit exceeded');
  });

  test('returns danger with error message for unexpected error during reset', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
    resetPasswordForEmailMock.mockRejectedValueOnce(new Error('SMTP failure'));

    const fd = new FormData();
    fd.append('email', 'user@example.com');

    const result = await forgotPassword(fd);
    expect(result.alertColor).toBe('danger');
    expect(result.message).toContain('SMTP failure');
  });
});
