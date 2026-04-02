import { describe, expect, test } from '@jest/globals';
import { getBsThemeDatasetValue, isValidTheme, resolveTheme } from '../../frontend/src/utils/theme-utils';

// This file unit-tests theme helper logic used by ThemeContext.

describe('Theme utility unit tests', () => {
  // Ensures theme validation accepts only allowed values.
  test('isValidTheme accepts valid themes and rejects others', () => {
    expect(isValidTheme('light')).toBe(true);
    expect(isValidTheme('dark')).toBe(true);
    expect(isValidTheme('auto')).toBe(true);
    expect(isValidTheme('sepia')).toBe(false);
  });

  // Ensures explicit themes resolve directly regardless of system preference.
  test('resolveTheme keeps explicit light/dark values', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  // Ensures auto theme resolves based on prefers-dark flag.
  test('resolveTheme maps auto to dark/light from preference', () => {
    expect(resolveTheme('auto', true)).toBe('dark');
    expect(resolveTheme('auto', false)).toBe('light');
  });

  // Ensures bs-theme dataset mapping omits value for auto mode.
  test('getBsThemeDatasetValue returns undefined for auto', () => {
    expect(getBsThemeDatasetValue('auto')).toBeUndefined();
    expect(getBsThemeDatasetValue('dark')).toBe('dark');
  });
});
