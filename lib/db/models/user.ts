import mongoose, { Schema, Model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IBadge {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  earnedAt?: Date;
}

export interface IUserAddress {
  _id?:      Types.ObjectId;
  label:     string;       // "Home", "Work", etc.
  street:    string;
  building?: string;
  apt?:      string;
  city:      string;
  zip?:      string;
  notes?:    string;
  coords?:   { lat: number; lng: number };
  isDefault: boolean;
  createdAt?: Date;
}

export interface IWebAuthnCredential {
  _id?:         Types.ObjectId;
  credentialID: string;     // base64url
  publicKey:    string;     // base64url
  counter:      number;
  transports:   string[];
  label:        string;
  createdAt?:   Date;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  name?: string;
  email?: string;
  phone?: string;
  avatar: string | null;
  isGuest: boolean;
  guestToken?: string;
  password?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  isEmailVerified: boolean;
  emailVerifyToken?: string;
  provider: 'local' | 'google' | 'facebook';
  googleId?: string | null;
  webauthnCredentials: IWebAuthnCredential[];
  role: 'user' | 'admin' | 'superadmin';
  xp: number;
  level: number;
  points: number;
  badges: IBadge[];
  referralCode?: string;
  referredBy: Types.ObjectId | null;
  referralRewardGiven: boolean;
  lastLoginAt?: Date;
  lastSpinAt: Date | null;
  bonusSpins: number;
  ordersCount: number;
  challengeWins: number;
  isActive: boolean;
  isBanned: boolean;
  banReason: string | null;
  addresses: IUserAddress[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  addXp(amount: number, coeff?: number): { didLevelUp: boolean; newLevel: number };
}

const BadgeSchema = new Schema<IBadge>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  icon: { type: String },
  earnedAt: { type: Date, default: Date.now },
}, { _id: false });

const WebAuthnCredentialSchema = new Schema<IWebAuthnCredential>({
  credentialID: { type: String, required: true, index: true },
  publicKey:    { type: String, required: true },
  counter:      { type: Number, default: 0 },
  transports:   { type: [String], default: [] },
  label:        { type: String, default: 'Device' },
}, { _id: true, timestamps: { createdAt: true, updatedAt: false } });

const UserAddressSchema = new Schema<IUserAddress>({
  label:    { type: String, required: true, default: 'Home' },
  street:   { type: String, required: true },
  building: { type: String, default: '' },
  apt:      { type: String, default: '' },
  city:     { type: String, required: true },
  zip:      { type: String, default: '' },
  notes:    { type: String, default: '' },
  coords: {
    lat: { type: Number },
    lng: { type: Number },
  },
  isDefault: { type: Boolean, default: false },
}, { _id: true, timestamps: { createdAt: true, updatedAt: false } });

const UserSchema = new Schema<IUser>({
  name: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true, sparse: true, unique: true },
  phone: { type: String, trim: true, sparse: true, unique: true },
  avatar: { type: String, default: null },
  isGuest: { type: Boolean, default: false },
  guestToken: { type: String, select: false },

  password: { type: String, select: false },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  isEmailVerified: { type: Boolean, default: false },
  emailVerifyToken: { type: String, select: false },
  provider: { type: String, enum: ['local', 'google', 'facebook'], default: 'local' },
  googleId: { type: String, default: null, sparse: true, unique: true },
  webauthnCredentials: { type: [WebAuthnCredentialSchema], default: [] },

  role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },

  xp: { type: Number, default: 0, min: 0 },
  level: { type: Number, default: 1, min: 1 },
  points: { type: Number, default: 0, min: 0 },
  badges: { type: [BadgeSchema], default: [] },

  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  referralRewardGiven: { type: Boolean, default: false },

  lastLoginAt: { type: Date },
  lastSpinAt: { type: Date, default: null },
  bonusSpins: { type: Number, default: 0 },
  ordersCount: { type: Number, default: 0 },
  challengeWins: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, default: null },

  addresses: { type: [UserAddressSchema], default: [] },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

UserSchema.index({ xp: -1 });
UserSchema.index({ points: -1 });
UserSchema.index({ createdAt: -1 });

UserSchema.virtual('levelTitle').get(function (this: IUser) {
  const titles = [
    'Newcomer', 'Regular', 'Food Lover', 'Challenger',
    'Arena Fighter', 'Champion', 'Elite', 'Legend', 'Myth', 'God of Prost',
  ];
  return titles[Math.min(this.level - 1, titles.length - 1)];
});

UserSchema.virtual('xpToNextLevel').get(function (this: IUser) {
  return calculateXpForLevel(this.level + 1) - this.xp;
});

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password!);
};

UserSchema.methods.addXp = function (amount: number, coeff: number = 100) {
  this.xp += amount;
  const newLevel = calculateLevelFromXp(this.xp, coeff);
  const didLevelUp = newLevel > this.level;
  this.level = newLevel;
  return { didLevelUp, newLevel };
};

function calculateXpForLevel(level: number, coeff: number = 100) {
  return level * level * coeff;
}

function calculateLevelFromXp(xp: number, coeff: number = 100) {
  let level = 1;
  while (calculateXpForLevel(level + 1, coeff) <= xp) level++;
  return level;
}

// HMR-safe registration. Next dev hot-reloads can leave a cached model with
// an outdated schema; force re-register if expected new paths are missing.
const EXPECTED_USER_PATHS = ['googleId', 'webauthnCredentials', 'addresses'];
if (mongoose.models.User) {
  const existing = Object.keys(mongoose.models.User.schema.paths);
  if (EXPECTED_USER_PATHS.some((p) => !existing.includes(p))) {
    mongoose.deleteModel('User');
  }
}

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);
