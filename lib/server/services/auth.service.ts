import { randomBytes } from 'crypto';
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
