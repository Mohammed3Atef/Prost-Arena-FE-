import { randomBytes } from 'crypto';

const REFERRAL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function xpForLevel(level: number, coeff: number = 100): number {
  return level * level * coeff;
}

export function levelFromXp(xp: number, coeff: number = 100): number {
  let level = 1;
  while (xpForLevel(level + 1, coeff) <= xp) level++;
  return level;
}

export function xpToNextLevel(xp: number, coeff: number = 100): number {
  const current = levelFromXp(xp, coeff);
  return xpForLevel(current + 1, coeff) - xp;
}

export function xpProgressInLevel(xp: number, coeff: number = 100) {
  const level = levelFromXp(xp, coeff);
  // Level 1 baseline is 0 XP; higher levels begin at xpForLevel(level).
  const levelStart = level <= 1 ? 0 : xpForLevel(level, coeff);
  const levelEnd = xpForLevel(level + 1, coeff);
  const progress = xp - levelStart;
  const required = Math.max(1, levelEnd - levelStart);
  return { level, progress, required, percentage: Math.floor((progress / required) * 100) };
}

function randomCode(length: number, alphabet = REFERRAL_ALPHABET): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export function generateReferralCode(): string {
  return `PA-${randomCode(8)}`;
}

const XP_PER_ORDER = parseInt(process.env.XP_PER_ORDER || '50', 10);
const POINTS_PER_CURRENCY_UNIT = 5;

export function calcOrderXp(order: { total: number }): number {
  const base = XP_PER_ORDER;
  const bonus = Math.floor(order.total / 10);
  return base + bonus;
}

export function calcOrderPoints(order: { total: number }): number {
  return Math.floor(order.total * POINTS_PER_CURRENCY_UNIT);
}

export const XP_PER_CHALLENGE_WIN = parseInt(process.env.XP_PER_CHALLENGE_WIN || '100', 10);
export const XP_PER_REFERRAL = parseInt(process.env.XP_PER_REFERRAL || '75', 10);
