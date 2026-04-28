'use client';

/**
 * Theme Provider
 * Reads system preference + user override from localStorage.
 * Adds/removes the 'dark' class on <html> so Tailwind's dark mode works.
 */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme:       Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme:    (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme:         'system',
  resolvedTheme: 'dark',
  setTheme:      () => {},
  toggleTheme:   () => {},
});

export function ThemeProvider({
  children,
  storageKey = 'pa-theme',
}: {
  children: ReactNode;
  /**
   * localStorage key for this theme scope. Pass a different key (e.g. 'pa-theme-admin')
   * to give a sub-tree (like /admin) its own independent dark/light preference.
   */
  storageKey?: string;
}) {
  const [theme, setThemeState] = useState<Theme>('system');

  // Resolved = what is actually shown (light | dark).
  // Default to 'light' so server HTML matches the most common case and avoids hydration mismatch.
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Initialise from localStorage on mount
  useEffect(() => {
    const stored = (localStorage.getItem(storageKey) as Theme) || 'system';
    setThemeState(stored);
  }, [storageKey]);

  // Apply theme to <html> whenever it changes
  useEffect(() => {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

    setResolvedTheme(resolved);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, [theme]);

  // Listen for system preference changes when mode is 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);
      document.documentElement.classList.toggle('dark', resolved === 'dark');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem(storageKey, t);
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
