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
      signOut: jest.fn(),
    },
  })),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import { forgotPassword, login } from '@/app/login/actions';

describe('Functional requirement: login page actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns user-friendly message for invalid credentials', async () => {
    const authError = new AuthError('Invalid login credentials');
    (authError as unknown as { code: string }).code = 'invalid_credentials';

    signInWithPasswordMock.mockResolvedValueOnce({ error: authError });

    const formData = new FormData();
    formData.append('email', 'user@test.com');
    formData.append('password', 'wrong-pass');

    const result = await login(formData);

    expect(result).toEqual({
      alertColor: 'danger',
      error: 'Invalid email or password.',
    });
  });

  test('validates email format for forgot-password flow', async () => {
    const formData = new FormData();
    formData.append('email', 'not-an-email');

    const result = await forgotPassword(formData);

    expect(result).toEqual({
      alertColor: 'danger',
      message: 'Please enter a valid email address.',
    });
    expect(resetPasswordForEmailMock).not.toHaveBeenCalled();
  });
});
