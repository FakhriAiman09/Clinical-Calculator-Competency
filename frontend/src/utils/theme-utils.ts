import type { Theme } from '@/context/ThemeContext';

export function isValidTheme(value: string): value is Theme {
  return value === 'light' || value === 'dark' || value === 'auto';
}

export function resolveTheme(theme: Theme, prefersDark: boolean): 'light' | 'dark' {
  if (theme !== 'auto') return theme;
  return prefersDark ? 'dark' : 'light';
}

export function getBsThemeDatasetValue(theme: Theme): string | undefined {
  if (theme === 'auto') return undefined;
  return theme;
}
