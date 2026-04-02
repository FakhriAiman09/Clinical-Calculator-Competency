import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';

// This file verifies auto theme mode resolves correctly when system prefers dark.

const mockUseUser = jest.fn();

jest.mock('../../frontend/src/context/UserContext', () => ({
  useUser: () => mockUseUser(),
}));

jest.mock('../../frontend/src/utils/supabase/client', () => ({
  createClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn<() => Promise<{ data: null; error: null }>>().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      upsert: jest.fn<() => Promise<{ error: null }>>().mockResolvedValue({ error: null }),
    })),
  }),
}));

import { ThemeProvider, useTheme } from '../../frontend/src/context/ThemeContext';

function ThemeConsumer() {
  const { theme, resolvedTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
    </div>
  );
}


describe('ThemeContext auto mode dark resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockUseUser.mockReturnValue({ user: null });
    localStorage.setItem('theme', 'auto');

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });
  });

  // Auto mode should remain auto, but effective theme should resolve to dark.
  test('keeps theme as auto while resolving effective theme to dark', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('auto');
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
      expect(document.documentElement.dataset.bsTheme).toBeUndefined();
    });
  });
});
