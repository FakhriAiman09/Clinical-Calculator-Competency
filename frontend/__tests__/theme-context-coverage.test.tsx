// Tests for ThemeContext.tsx - context provider for theme management
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme, type Theme } from '@/context/ThemeContext';
import React, { useEffect } from 'react';

// Mutable supabase mock so we can control from() behavior per test
const mockFrom = jest.fn();
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: (...args: any[]) => mockFrom(...args),
    auth: { getUser: jest.fn() },
  })),
}));

// Mock UserContext
const mockUseUser = jest.fn();
jest.mock('@/context/UserContext', () => ({
  useUser: () => mockUseUser(),
}));

// Mock theme-utils
jest.mock('@/utils/theme-utils', () => ({
  getBsThemeDatasetValue: (theme: string) => {
    if (theme === 'auto') return undefined;
    return theme;
  },
  isValidTheme: (t: string) => ['light', 'dark', 'auto'].includes(t),
  resolveTheme: (theme: string, isDark: boolean) => {
    if (theme === 'dark') return 'dark';
    if (theme === 'light') return 'light';
    return isDark ? 'dark' : 'light';
  },
}));

// Mock matchMedia
const mockMatchMedia = jest.fn().mockReturnValue({
  matches: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
});
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

// Mock localStorage
const localStorageMock: Record<string, string> = {};
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn((key: string) => localStorageMock[key] ?? null),
    setItem: jest.fn((key: string, val: string) => { localStorageMock[key] = val; }),
    removeItem: jest.fn((key: string) => { delete localStorageMock[key]; }),
    clear: jest.fn(() => { Object.keys(localStorageMock).forEach(k => delete localStorageMock[k]); }),
  },
  writable: true,
});

// Consumer component for testing
const TestConsumer = ({ onTheme }: { onTheme: (val: { theme: Theme; resolvedTheme: 'light' | 'dark' }) => void }) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  useEffect(() => { onTheme({ theme, resolvedTheme }); }, [theme, resolvedTheme]);
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme('dark')}>dark</button>
      <button onClick={() => setTheme('light')}>light</button>
      <button onClick={() => setTheme('auto')}>auto</button>
    </div>
  );
};

function makeSupabaseMock(themeData: { theme?: string } | null, error: object | null = null) {
  mockFrom.mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: themeData, error }),
      }),
    }),
    upsert: jest.fn().mockResolvedValue({ error: null }),
  });
}

describe('ThemeContext - ThemeProvider', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    Object.keys(localStorageMock).forEach(k => delete localStorageMock[k]);
    (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) => localStorageMock[key] ?? null);
    (window.localStorage.setItem as jest.Mock).mockImplementation((key: string, val: string) => { localStorageMock[key] = val; });
    mockUseUser.mockReturnValue({ user: null });
    makeSupabaseMock(null);
  });

  it('should render children inside provider', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <div data-testid="child">hello</div>
        </ThemeProvider>
      );
    });
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should provide default theme as auto when no localStorage value', async () => {
    const onTheme = jest.fn();
    await act(async () => {
      render(
        <ThemeProvider>
          <TestConsumer onTheme={onTheme} />
        </ThemeProvider>
      );
    });
    expect(screen.getByTestId('theme')).toHaveTextContent('auto');
  });

  it('should initialize from localStorage valid theme', async () => {
    localStorageMock['theme'] = 'dark';
    (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) => localStorageMock[key] ?? null);

    const onTheme = jest.fn();
    await act(async () => {
      render(
        <ThemeProvider>
          <TestConsumer onTheme={onTheme} />
        </ThemeProvider>
      );
    });
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('should load theme from DB when user is logged in', async () => {
    mockUseUser.mockReturnValue({ user: { id: 'user-1' } });
    makeSupabaseMock({ theme: 'light' });

    const onTheme = jest.fn();
    await act(async () => {
      render(
        <ThemeProvider>
          <TestConsumer onTheme={onTheme} />
        </ThemeProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('light');
    });
  });

  it('should handle DB error and fall back gracefully', async () => {
    mockUseUser.mockReturnValue({ user: { id: 'user-1' } });
    makeSupabaseMock(null, { message: 'DB error' });

    const onTheme = jest.fn();
    await act(async () => {
      render(
        <ThemeProvider>
          <TestConsumer onTheme={onTheme} />
        </ThemeProvider>
      );
    });
    expect(screen.getByTestId('theme')).toBeInTheDocument();
  });

  it('should update theme when setTheme is called', async () => {
    mockUseUser.mockReturnValue({ user: null });
    const user = userEvent.setup();

    await act(async () => {
      render(
        <ThemeProvider>
          <TestConsumer onTheme={jest.fn()} />
        </ThemeProvider>
      );
    });

    await act(async () => {
      await user.click(screen.getByText('dark'));
    });

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(window.localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  it('should save theme to DB when user is logged in and setTheme is called', async () => {
    const mockUpsert = jest.fn().mockResolvedValue({ error: null });
    mockUseUser.mockReturnValue({ user: { id: 'user-1' } });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      upsert: mockUpsert,
    });

    const user = userEvent.setup();
    await act(async () => {
      render(
        <ThemeProvider>
          <TestConsumer onTheme={jest.fn()} />
        </ThemeProvider>
      );
    });

    await act(async () => {
      await user.click(screen.getByText('light'));
    });

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ theme: 'light' }),
        { onConflict: 'id' }
      );
    });
  });
});

describe('ThemeContext - useTheme hook', () => {
  it('should throw error when used outside ThemeProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TestHookConsumer = () => {
      useTheme();
      return null;
    };

    expect(() => render(<TestHookConsumer />)).toThrow();
    consoleError.mockRestore();
  });
});

