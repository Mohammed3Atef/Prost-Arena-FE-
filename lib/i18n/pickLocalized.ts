/**
 * Pick the right-language string from an object that uses the suffix pattern.
 *
 * For a base key `title`, this returns `obj.titleAr` when `locale === 'ar'`
 * AND that field is non-empty; otherwise it falls back to `obj.title` (the
 * default/English value). Existing single-language documents continue to
 * work because the Arabic field is just empty.
 *
 *   pickLocalized(banner, 'ar', 'title')    // → banner.titleAr || banner.title
 *   pickLocalized(banner, 'en', 'ctaLabel') // → banner.ctaLabel
 */
export function pickLocalized<T extends Record<string, unknown>>(
  obj: T | null | undefined,
  locale: string,
  baseKey: string,
): string {
  if (!obj) return '';
  if (locale === 'ar') {
    const ar = obj[`${baseKey}Ar`];
    if (typeof ar === 'string' && ar.trim()) return ar;
  }
  const base = obj[baseKey];
  return typeof base === 'string' ? base : '';
}
