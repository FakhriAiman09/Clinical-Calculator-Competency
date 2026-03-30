import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';

const mockUseUser = jest.fn();

jest.mock('../../frontend/src/context/UserContext', () => ({
  useUser: () => mockUseUser(),
}));

jest.mock('../../frontend/src/utils/supabase/client', () => ({
  createClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      upsert: jest.fn().mockResolvedValue({ error: null }),
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

describe('ThemeContext invalid localStorage fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockUseUser.mockReturnValue({ user: null });
    localStorage.setItem('theme', 'not-a-valid-theme');

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });
  });

  test('falls back to auto and resolves to light when storage value is invalid', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('auto');
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
      expect(document.documentElement.dataset.bsTheme).toBeUndefined();
    });
  });
});
