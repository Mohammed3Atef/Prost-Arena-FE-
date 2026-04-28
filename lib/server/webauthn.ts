import jwt from 'jsonwebtoken';
import type { NextRequest } from 'next/server';

/**
 * Helpers for the WebAuthn flow.
 *
 * Challenges are stashed in short-lived signed JWTs (5 min TTL) so the
 * options-emitting endpoint and the verify endpoint don't need a shared DB
 * collection. The cookie is HttpOnly + Secure in prod.
 *
 * RP_ID and origin are derived from the incoming request at runtime so the
 * same code works on localhost and on any production hostname (Vercel,
 * custom domain, etc.) without redeploying or fiddling with env vars.
 */

export const RP_NAME = process.env.WEBAUTHN_RP_NAME || 'Prost Arena';

/** Hostname (no port) that the user's browser will report. */
export function rpIdFromRequest(req: NextRequest): string {
  // Honor an explicit override if set (useful for staging custom domains).
  if (process.env.WEBAUTHN_RP_ID) return process.env.WEBAUTHN_RP_ID;
  // `req.nextUrl.hostname` strips the port (which is what WebAuthn wants).
  // Falls back to the Host header if nextUrl is unavailable.
  const host = req.nextUrl?.hostname || req.headers.get('host')?.split(':')[0] || 'localhost';
  return host;
}

/** Full origin (scheme + host + port) the credential will be bound to. */
export function originFromRequest(req: NextRequest): string {
  if (process.env.WEBAUTHN_ORIGIN) return process.env.WEBAUTHN_ORIGIN;
  // x-forwarded-proto handles the Vercel/proxy case where req.nextUrl.protocol may be 'http'.
  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl?.protocol?.replace(':', '') || 'http';
  const host  = req.headers.get('host') || req.nextUrl?.host || 'localhost:3000';
  return `${proto}://${host}`;
}

const CHALLENGE_TTL = '5m';
const COOKIE_BASE = 'pa-webauthn-challenge';

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is required for WebAuthn challenges');
  return s;
}

export function signChallenge(payload: { challenge: string; userId?: string; type: 'register' | 'login' }): string {
  return jwt.sign(payload, secret(), { expiresIn: CHALLENGE_TTL });
}

export function verifyChallenge(token: string | undefined | null): { challenge: string; userId?: string; type: 'register' | 'login' } {
  if (!token) throw new Error('Missing challenge cookie');
  return jwt.verify(token, secret()) as { challenge: string; userId?: string; type: 'register' | 'login' };
}

export function challengeCookieName(type: 'register' | 'login') {
  return `${COOKIE_BASE}-${type}`;
}

/** Build a NextResponse-style cookie value. */
export function challengeCookieOptions() {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path:     '/',
    maxAge:   60 * 5, // 5 min
  };
}
