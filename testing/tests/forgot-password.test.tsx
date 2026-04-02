import { describe, expect, test } from '@jest/globals';
import { isValidEmailFormat, validateForgotPasswordEmail } from '../../frontend/src/utils/forgot-password-utils';

// This file unit-tests forgot-password input validation helpers.

describe('Forgot password unit tests', () => {
  // Ensures common valid emails pass format validation.
  test('isValidEmailFormat accepts valid emails', () => {
    expect(isValidEmailFormat('user@example.com')).toBe(true);
    expect(isValidEmailFormat('name.surname+tag@school.edu')).toBe(true);
  });

  // Ensures malformed emails are rejected.
  test('isValidEmailFormat rejects invalid emails', () => {
    expect(isValidEmailFormat('invalid-email')).toBe(false);
    expect(isValidEmailFormat('user@')).toBe(false);
  });

  // Ensures empty input returns required-field message.
  test('validateForgotPasswordEmail returns required message for empty input', () => {
    expect(validateForgotPasswordEmail('   ')).toEqual({
      valid: false,
      message: 'Email is required',
    });
  });

  // Ensures invalid format returns format error message.
  test('validateForgotPasswordEmail returns invalid-format message', () => {
    expect(validateForgotPasswordEmail('abc')).toEqual({
      valid: false,
      message: 'Invalid email format',
    });
  });

  // Ensures valid input returns success state.
  test('validateForgotPasswordEmail returns valid true for proper email', () => {
    expect(validateForgotPasswordEmail('user@example.com')).toEqual({
      valid: true,
      message: '',
    });
  });
});
