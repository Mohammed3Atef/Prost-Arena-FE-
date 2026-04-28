import '@/lib/models';
import { randomBytes } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { User, type IUser } from '@/lib/db/models/user';
import { Referral } from '@/lib/db/models/referral';
import { issueTokens, verifyRefreshToken } from '@/lib/server/auth';
import { generateReferralCode } from '@/lib/server/gamification';
import { operationalError } from '@/lib/server/error';
import * as otpService from './otp.service';
import type {
  RegisterInput,
  LoginInput,
  GuestCheckoutInput,
  OtpVerifyInput,
} from '@/lib/validation/auth.schema';

function sanitize(user: IUser): Record<string, unknown> {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete (obj as any).password;
  delete (obj as any).guestToken;
  delete (obj as any).emailVerifyToken;
  delete (obj as any).passwordResetToken;
  delete (obj as any).passwordResetExpires;
  return obj;
}

export async function register(input: RegisterInput) {
  const existing = await User.findOne({ email: input.email });
  if (existing) throw operationalError('Email already registered', 409);

  let referrer = null;
  if (input.referralCode) {
    referrer = await User.findOne({ referralCode: input.referralCode });
  }

  const user = await User.create({
    name: input.name,
    email: input.email,
    password: input.password,
    phone: input.phone,
    referralCode: generateReferralCode(),
    referredBy: referrer?._id ?? null,
  });

  if (referrer) {
    await Referral.create({
      referrer: referrer._id,
      referred: user._id,
      code: input.referralCode,
    });
  }

  const tokens = issueTokens(user);
  console.log(`[auth] new user registered: ${input.email}`);
  return { user: sanitize(user), ...tokens };
}

export async function login(input: LoginInput) {
  const user = await User.findOne({ email: input.email }).select('+password');
  if (!user) throw operationalError('Invalid credentials', 401);

  const match = await user.comparePassword(input.password);
  if (!match) throw operationalError('Invalid credentials', 401);

  if (user.isBanned) throw operationalError('Account is suspended', 403);

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = issueTokens(user);
  return { user: sanitize(user), ...tokens };
}

export async function guestCheckout(input: GuestCheckoutInput) {
  const guestToken = randomBytes(32).toString('hex');
  const user = await User.create({
    name: input.name,
    email: input.email || undefined,
    phone: input.phone,
    isGuest: true,
    guestToken,
    password: randomBytes(16).toString('hex'),
    referralCode: generateReferralCode(),
  });

  const tokens = issueTokens(user);
  return { user: sanitize(user), ...tokens, guestToken };
}

export async function sendOtp(phone: string) {
  const normalised = phone.replace(/\s+/g, '');
  await otpService.sendOtp(normalised);
  return { phone: normalised };
}

export async function verifyOtpAndAuth(input: OtpVerifyInput) {
  const normalised = input.phone.replace(/\s+/g, '');
  await otpService.verifyOtp(normalised, input.otp);

  let user = await User.findOne({ phone: normalised });
  const isNew = !user;

  if (!user) {
    if (!input.name || input.name.trim().length < 2) {
      throw operationalError('Full name is required for new accounts', 400);
    }

    let referrer = null;
    if (input.referralCode) {
      referrer = await User.findOne({ referralCode: input.referralCode });
    }

    user = await User.create({
      name: input.name.trim(),
      phone: normalised,
      referralCode: generateReferralCode(),
      referredBy: referrer?._id ?? null,
      password: randomBytes(16).toString('hex'),
    });

    if (referrer) {
      await Referral.create({
        referrer: referrer._id,
        referred: user._id,
        code: input.referralCode,
      });
    }

    console.log(`[auth] new user registered via phone: ${normalised}`);
  } else {
    if (user.isBanned) throw operationalError('Account is suspended', 403);
    user.lastLoginAt = new Date();
    await user.save();
  }

  const tokens = issueTokens(user);
  return { user: sanitize(user), ...tokens, isNew };
}

interface GoogleProfile {
  sub:             string;
  email:           string;
  email_verified?: boolean;
  name?:           string;
  picture?:        string;
}

/**
 * Resolve a Google profile from either an OAuth ID token (JWT, full verification
 * via google-auth-library) or an OAuth access token (verified via Google's
 * userinfo endpoint). Either path is acceptable.
 */
async function resolveGoogleProfile(input: { idToken?: string; accessToken?: string }): Promise<GoogleProfile> {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw operationalError('Google sign-in is not configured on the server', 503);
  }

  if (input.idToken) {
    const client = new OAuth2Client(clientId);
    let payload;
    try {
      const ticket = await client.verifyIdToken({ idToken: input.idToken, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      throw operationalError('Invalid Google token', 401);
    }
    if (!payload?.sub || !payload.email) throw operationalError('Empty Google payload', 401);
    return {
      sub:             payload.sub,
      email:           payload.email,
      email_verified:  payload.email_verified,
      name:            payload.name,
      picture:         payload.picture,
    };
  }

  if (input.accessToken) {
    // userinfo endpoint returns the verified profile bound to this token
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    });
    if (!res.ok) throw operationalError('Invalid Google token', 401);
    const info = (await res.json()) as Partial<GoogleProfile>;
    if (!info.sub || !info.email) throw operationalError('Empty Google profile', 401);
    return {
      sub:             info.sub,
      email:           info.email,
      email_verified:  info.email_verified,
      name:            info.name,
      picture:         info.picture,
    };
  }

  throw operationalError('idToken or accessToken is required', 400);
}

/**
 * Verify a Google credential (ID token or access token) and issue Prost auth tokens.
 *
 * Lookup order:
 *   1. by googleId (already linked)
 *   2. by email (link this Google account to an existing local user)
 *   3. create a new Google-provider user
 *
 * Returns `{ user, accessToken, refreshToken, isNew, needsPhone }`.
 */
export async function signInWithGoogle(input: { idToken?: string; accessToken?: string } | string) {
  // Backwards-compatible: callers may pass a bare id token string.
  const args = typeof input === 'string' ? { idToken: input } : input;
  const { sub, email, email_verified, name, picture } = await resolveGoogleProfile(args);
  if (email_verified === false) throw operationalError('Google email not verified', 403);

  let isNew = false;
  let user = await User.findOne({ googleId: sub });

  if (!user) {
    user = await User.findOne({ email });
    if (user) {
      // Link Google to existing local account.
      user.googleId = sub;
      user.provider = 'google';
      user.isEmailVerified = true;
      if (!user.avatar && picture) user.avatar = picture;
      if (!user.name && name) user.name = name;
      await user.save();
    } else {
      // Create fresh user. password is required for the schema; use a
      // random throwaway since this user authenticates via Google only.
      user = await User.create({
        googleId:        sub,
        email,
        name:            name || email.split('@')[0],
        avatar:          picture ?? null,
        provider:        'google',
        isEmailVerified: true,
        password:        randomBytes(16).toString('hex'),
        referralCode:    generateReferralCode(),
      });
      isNew = true;
      console.log(`[auth] new user via Google: ${email}`);
    }
  }

  if (user.isBanned) throw operationalError('Account is suspended', 403);
  user.lastLoginAt = new Date();
  await user.save();

  const tokens = issueTokens(user);
  return {
    user: sanitize(user),
    ...tokens,
    isNew,
    needsPhone: !user.phone,
  };
}

export async function refreshTokens(refreshToken: string) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw operationalError('Invalid refresh token', 401);
  }

  const user = await User.findById(decoded.sub);
  if (!user || user.isActive === false || user.isBanned === true) {
    throw operationalError('User not available', 401);
  }

  return issueTokens(user);
}
