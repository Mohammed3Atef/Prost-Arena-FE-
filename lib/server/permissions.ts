import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getUserFromRequest, type SafeUser } from './auth';
import { unauthorized, forbidden } from './response';

export type AuthResult =
  | { user: SafeUser; error: null }
  | { user: null; error: NextResponse };

export async function requireAuth(req: NextRequest): Promise<AuthResult> {
  const user = await getUserFromRequest(req);
  if (!user) return { user: null, error: unauthorized('No token provided') };
  return { user, error: null };
}

export async function optionalAuth(req: NextRequest): Promise<SafeUser | null> {
  return await getUserFromRequest(req);
}

export function requireRole(user: SafeUser | null, ...roles: string[]): NextResponse | null {
  if (!user) return unauthorized();
  if (!roles.includes(user.role)) return forbidden('Insufficient permissions');
  return null;
}
