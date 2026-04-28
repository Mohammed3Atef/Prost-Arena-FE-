import jwt from 'jsonwebtoken';

/**
 * Helpers for the WebAuthn flow.
 *
 * Challenges are stashed in short-lived signed JWTs (5 min TTL) so the
 * options-emitting endpoint and the verify endpoint don't need a shared DB
 * collection. The cookie is HttpOnly + Secure in prod.
 */

export const RP_ID     = process.env.WEBAUTHN_RP_ID     || 'localhost';
export const RP_NAME   = process.env.WEBAUTHN_RP_NAME   || 'Prost Arena';
export const RP_ORIGIN = process.env.WEBAUTHN_ORIGIN    || (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

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
