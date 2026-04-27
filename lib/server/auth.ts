import jwt, { type SignOptions } from 'jsonwebtoken';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { User, type IUser } from '@/lib/db/models/user';

const ISSUER = process.env.JWT_ISSUER || 'ProstArena';

function getAccessSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is required');
  return s;
}

function getRefreshSecret(): string {
  return process.env.JWT_REFRESH_SECRET || getAccessSecret();
}

export interface JwtPayload {
  sub: string;
  role: string;
}

export function signAccessToken(payload: JwtPayload): string {
  const opts: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
    issuer: ISSUER,
  };
  return jwt.sign(payload, getAccessSecret(), opts);
}

export function signRefreshToken(payload: JwtPayload): string {
  const opts: SignOptions = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as SignOptions['expiresIn'],
    issuer: ISSUER,
  };
  return jwt.sign(payload, getRefreshSecret(), opts);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, getAccessSecret(), { issuer: ISSUER }) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, getRefreshSecret(), { issuer: ISSUER }) as JwtPayload;
}

export function issueTokens(user: { _id: { toString(): string }; role: string }) {
  const payload: JwtPayload = { sub: user._id.toString(), role: user.role };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return req.cookies.get('accessToken')?.value ?? null;
}

export type SafeUser = Omit<IUser, 'password' | 'guestToken' | 'passwordResetToken' | 'emailVerifyToken'>;

export async function getUserFromRequest(req: NextRequest): Promise<SafeUser | null> {
  const token = extractToken(req);
  if (!token) return null;
  try {
    const decoded = verifyAccessToken(token);
    await dbConnect();
    const user = await User.findById(decoded.sub).select('-password').lean<SafeUser>();
    if (!user) return null;
    if (user.isActive === false || user.isBanned === true) return null;
    return user;
  } catch {
    return null;
  }
}
