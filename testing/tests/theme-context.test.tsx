import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

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
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
      <button type="button" onClick={() => void setTheme('dark')}>
        set-dark
      </button>
      <button type="button" onClick={() => void setTheme('auto')}>
        set-auto
      </button>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });

    mockUseUser.mockReturnValue({ user: null });
    delete document.documentElement.dataset.bsTheme;
  });

  test('throws when useTheme is used outside ThemeProvider', () => {
    const BrokenConsumer = () => {
      useTheme();
      return <div>bad</div>;
    };

    expect(() => render(<BrokenConsumer />)).toThrow('useTheme must be used within ThemeProvider');
  });

  test('loads theme from localStorage when logged out and applies it to html dataset', async () => {
    localStorage.setItem('theme', 'dark');

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
      expect(document.documentElement.dataset.bsTheme).toBe('dark');
    });
  });

  test('setTheme updates state, localStorage, and html dataset', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'set-dark' }));

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      expect(localStorage.getItem('theme')).toBe('dark');
      expect(document.documentElement.dataset.bsTheme).toBe('dark');
    });
  });

  test('setTheme auto removes html dataset theme', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'set-auto' }));

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('auto');
      expect(localStorage.getItem('theme')).toBe('auto');
      expect(document.documentElement.dataset.bsTheme).toBeUndefined();
    });
  });
});
