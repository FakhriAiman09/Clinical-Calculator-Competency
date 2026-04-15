export function isValidEmailFormat(email: string): boolean {
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');

  if (atIndex <= 0 || atIndex !== trimmed.lastIndexOf('@')) return false;
  if (atIndex === trimmed.length - 1) return false;
  for (const char of trimmed) {
    if (char <= ' ') return false;
  }

  const domain = trimmed.slice(atIndex + 1);
  const dotIndex = domain.lastIndexOf('.');

  return dotIndex > 0 && dotIndex < domain.length - 1;
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
