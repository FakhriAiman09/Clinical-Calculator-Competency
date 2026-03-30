import { AuthError } from '@supabase/supabase-js';

// Individual auth method mocks so each test can control what Supabase auth returns.
const signInWithPasswordMock = jest.fn();
const signUpMock = jest.fn();
const resetPasswordForEmailMock = jest.fn();

// Mock server-side Supabase client and wire up the auth mock functions above.
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

// Mock logger to suppress file writes during tests.
jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

// login: submits email + password via Supabase and returns an error/success object.
// forgotPassword: validates email format then triggers Supabase password-reset email.
import { forgotPassword, login } from '@/app/login/actions';

// Test suite for login and forgot-password server actions.
describe('Functional requirement: login page actions', () => {
  // Reset all mock call history before each test.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Verifies login returns a readable danger message when Supabase rejects credentials.
  test('returns user-friendly message for invalid credentials', async () => {
    // Build a Supabase AuthError with the specific code the action checks for.
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

  // Verifies forgotPassword rejects invalid email formats before calling Supabase.
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
