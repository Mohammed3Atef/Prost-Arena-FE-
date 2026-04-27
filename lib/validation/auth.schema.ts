import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(50),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(6).max(128),
  phone: z.string().trim().optional(),
  referralCode: z.string().trim().toUpperCase().optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const guestCheckoutSchema = z.object({
  name: z.string().trim().min(2).max(50),
  email: z.string().email().toLowerCase().trim().optional(),
  phone: z.string().trim().min(1),
});
export type GuestCheckoutInput = z.infer<typeof guestCheckoutSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const otpSendSchema = z.object({
  phone: z.string().trim().min(7).max(20),
});
export type OtpSendInput = z.infer<typeof otpSendSchema>;

export const otpVerifySchema = z.object({
  phone: z.string().trim().min(7).max(20),
  otp: z.string().length(6).regex(/^\d+$/),
  name: z.string().trim().min(2).max(50).optional(),
  referralCode: z.string().trim().toUpperCase().optional(),
});
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
