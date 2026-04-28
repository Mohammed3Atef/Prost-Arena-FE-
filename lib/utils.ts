import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge TailwindCSS classes without conflicts */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format an amount as Egyptian Pounds (EGP).
 * Pass `locale` to control formatting:
 *   - 'en' → "EGP 110.00"
 *   - 'ar' → "١١٠٫٠٠ ج.م.‏" (Arabic-Egypt locale formatting)
 */
export function formatCurrency(amount: number, locale: 'en' | 'ar' = 'en') {
  const tag = locale === 'ar' ? 'ar-EG' : 'en-EG';
  try {
    return new Intl.NumberFormat(tag, { style: 'currency', currency: 'EGP' }).format(amount);
  } catch {
    return `EGP ${amount.toFixed(2)}`;
  }
}

/** Format large numbers (1200 → 1.2k) */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

/** XP progress within a level. Coefficient is admin-configurable (default 100). */
export function xpProgress(xp: number, coeff: number = 100) {
  const level      = levelFromXp(xp, coeff);
  const levelStart = xpForLevel(level, coeff);
  const levelEnd   = xpForLevel(level + 1, coeff);
  const progress   = xp - levelStart;
  const required   = levelEnd - levelStart;
  return { level, progress, required, percentage: Math.min(100, Math.floor((progress / required) * 100)) };
}

function xpForLevel(level: number, coeff: number = 100) { return level * level * coeff; }
function levelFromXp(xp: number, coeff: number = 100) {
  let l = 1;
  while (xpForLevel(l + 1, coeff) <= xp) l++;
  return l;
}

/** Get ordinal suffix: 1 → '1st', 2 → '2nd' */
export function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Delay */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
