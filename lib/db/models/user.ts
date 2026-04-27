import mongoose, { Schema, Model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IBadge {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  earnedAt?: Date;
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
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  addXp(amount: number): { didLevelUp: boolean; newLevel: number };
}

const BadgeSchema = new Schema<IBadge>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  icon: { type: String },
  earnedAt: { type: Date, default: Date.now },
}, { _id: false });

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

UserSchema.methods.addXp = function (amount: number) {
  this.xp += amount;
  const newLevel = calculateLevelFromXp(this.xp);
  const didLevelUp = newLevel > this.level;
  this.level = newLevel;
  return { didLevelUp, newLevel };
};

function calculateXpForLevel(level: number) {
  return level * level * 100;
}

function calculateLevelFromXp(xp: number) {
  let level = 1;
  while (calculateXpForLevel(level + 1) <= xp) level++;
  return level;
}

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);
