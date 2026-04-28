import en from './messages/en.json';
import ar from './messages/ar.json';

export type Locale = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';

export const LOCALES: Locale[] = ['en', 'ar'];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'pa-locale';

export const LOCALE_DIR: Record<Locale, Direction> = { en: 'ltr', ar: 'rtl' };

export const LOCALE_LABEL: Record<Locale, string> = { en: 'English', ar: 'العربية' };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MESSAGES: Record<Locale, any> = { en, ar };

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'en' || value === 'ar';
}

/** Resolve a dotted key like "spin.title" against the message tree. */
function resolve(obj: unknown, key: string): string | undefined {
  const parts = key.split('.');
  let node: unknown = obj;
  for (const p of parts) {
    if (node && typeof node === 'object' && p in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof node === 'string' ? node : undefined;
}

/** Replace {placeholder} tokens in a template. */
export function format(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
}

export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const fromLocale = resolve(MESSAGES[locale], key);
  if (fromLocale !== undefined) return format(fromLocale, vars);
  // Fall back to English if a key is missing in the active locale
  const fromEn = resolve(MESSAGES.en, key);
  return format(fromEn ?? key, vars);
}
