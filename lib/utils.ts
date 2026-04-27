import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge TailwindCSS classes without conflicts */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format currency */
export function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

/** Format large numbers (1200 → 1.2k) */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

/** XP progress within a level */
export function xpProgress(xp: number) {
  const level     = levelFromXp(xp);
  const levelStart = xpForLevel(level);
  const levelEnd   = xpForLevel(level + 1);
  const progress   = xp - levelStart;
  const required   = levelEnd - levelStart;
  return { level, progress, required, percentage: Math.min(100, Math.floor((progress / required) * 100)) };
}

function xpForLevel(level: number) { return level * level * 100; }
function levelFromXp(xp: number) {
  let l = 1;
  while (xpForLevel(l + 1) <= xp) l++;
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
