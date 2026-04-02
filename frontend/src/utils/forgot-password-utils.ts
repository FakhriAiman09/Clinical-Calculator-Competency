export function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validateForgotPasswordEmail(email: string): { valid: boolean; message: string } {
  const trimmed = email.trim();

  if (!trimmed) {
    return { valid: false, message: 'Email is required' };
  }

  if (!isValidEmailFormat(trimmed)) {
    return { valid: false, message: 'Invalid email format' };
  }

  return { valid: true, message: '' };
}
