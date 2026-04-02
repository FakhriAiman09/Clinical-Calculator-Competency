import { describe, expect, test } from '@jest/globals';
import { resolveTheme } from '../../frontend/src/utils/theme-utils';

// This file unit-tests auto-dark theme resolution behavior.

describe('Theme auto-dark unit tests', () => {
  // Ensures auto mode becomes dark when system preference is dark.
  test('resolveTheme returns dark for auto when prefers dark', () => {
    expect(resolveTheme('auto', true)).toBe('dark');
  });

  // Ensures auto mode becomes light when system preference is light.
  test('resolveTheme returns light for auto when prefers light', () => {
    expect(resolveTheme('auto', false)).toBe('light');
  });
});
