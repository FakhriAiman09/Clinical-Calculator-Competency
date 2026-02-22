'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from './UserContext';

export type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => Promise<void>;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const supabase = createClient();

/**
 * Applies the Bootstrap data-bs-theme attribute to <html>.
 * 'auto' removes the attribute so Bootstrap follows prefers-color-scheme.
 */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'auto') {
    delete root.dataset.bsTheme;
  } else {
    root.dataset.bsTheme = theme;
  }
}

/**
 * Resolves 'auto' to the actual system preference.
 */
function getResolvedTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'auto') return theme;
  return globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  const { user } = useUser();

  /**
   * Initialize state immediately from localStorage.
   * This keeps the value consistent with what the anti-flicker script already
   * applied to <html> before React hydrated — no reset-to-auto flash.
   */
  const [theme, setTheme] = useState<Theme>(() => {
    if (globalThis.window === undefined) return 'auto';
    const stored = localStorage.getItem('theme') as Theme | null;
    return stored && ['light', 'dark', 'auto'].includes(stored) ? stored : 'auto';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  /**
   * On login/logout: fetch from DB and sync back to localStorage.
   * DB is the source of truth when logged in.
   * After this runs, every subsequent refresh reads the correct value
   * from localStorage instantly — no visible flash.
   */
  useEffect(() => {
    async function loadTheme() {
      let loaded: Theme = 'auto';

      if (user) {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('theme')
          .eq('id', user.id)
          .single();

        if (!error && data?.theme) {
          loaded = data.theme as Theme;
          // Always sync DB value back to localStorage so future
          // refreshes on this device are instant and flash-free.
          localStorage.setItem('theme', loaded);
        }
      } else {
        // Logged out: use whatever is in localStorage
        const stored = localStorage.getItem('theme') as Theme | null;
        if (stored && ['light', 'dark', 'auto'].includes(stored)) {
          loaded = stored;
        }
      }

      setTheme(loaded);
      applyTheme(loaded);
      setResolvedTheme(getResolvedTheme(loaded));
    }

    loadTheme();
  }, [user]);

  // Track system preference changes when theme is 'auto'
  useEffect(() => {
    const mq = globalThis.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'auto') {
        setResolvedTheme(mq.matches ? 'dark' : 'light');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  /**
   * Called when user picks a theme in Settings.
   * Updates state, DOM, localStorage, and Supabase simultaneously.
   */
  const updateTheme = useCallback(
    async (t: Theme) => {
      setTheme(t);
      applyTheme(t);
      setResolvedTheme(getResolvedTheme(t));
      localStorage.setItem('theme', t);

      if (user) {
        const { error } = await supabase
          .from('user_preferences')
          .upsert({ id: user.id, theme: t }, { onConflict: 'id' });

        if (error) {
          console.error('Failed to save theme preference:', error);
        }
      }
    },
    [user]
  );

  const value = useMemo(
    () => ({ theme, setTheme: updateTheme, resolvedTheme }),
    [theme, updateTheme, resolvedTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};