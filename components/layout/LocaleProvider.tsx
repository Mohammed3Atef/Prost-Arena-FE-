'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_DIR,
  isLocale,
  translate,
  type Direction,
  type Locale,
} from '../../lib/i18n/config';

interface LocaleContextValue {
  locale:    Locale;
  dir:       Direction;
  setLocale: (next: Locale) => void;
  t:         (key: string, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function applyHtmlAttributes(locale: Locale) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.lang = locale;
  html.dir  = LOCALE_DIR[locale];
}

export function LocaleProvider({
  initial,
  children,
}: {
  initial: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initial);
  const pathname = usePathname();

  // Admin is a separate platform — it always renders LTR/English regardless of
  // what the customer-side locale is set to. The /admin layout has its own
  // LocaleProvider with `initial="en"` and forces html attrs to en/ltr; here in
  // the parent provider we yield to it instead of fighting back in this effect.
  const isAdminRoute = !!pathname?.startsWith('/admin');

  useEffect(() => {
    if (isAdminRoute) return;
    applyHtmlAttributes(locale);
  }, [locale, isAdminRoute]);

  const setLocale = useCallback((next: Locale) => {
    if (!isLocale(next)) return;
    setLocaleState(next);
    applyHtmlAttributes(next);
    if (typeof document !== 'undefined') {
      // 1 year cookie
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    }
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    return translate(locale, key, vars);
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, dir: LOCALE_DIR[locale], setLocale, t }),
    [locale, setLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    // Safe fallback — don't crash if used outside provider during SSR edge
    return {
      locale:    DEFAULT_LOCALE as Locale,
      dir:       LOCALE_DIR[DEFAULT_LOCALE],
      setLocale: () => {},
      t:         (key: string, vars?: Record<string, string | number>) => translate(DEFAULT_LOCALE, key, vars),
    };
  }
  return ctx;
}
