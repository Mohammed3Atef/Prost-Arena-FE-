import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export type RewardType =
  | 'discount_pct'
  | 'discount_fixed'
  | 'free_item'
  | 'xp_boost'
  | 'points_grant'
  | 'free_delivery';

export type RewardSource =
  | 'spin_wheel'
  | 'challenge_win'
  | 'mission'
  | 'referral'
  | 'manual'
  | 'level_up';

export interface IReward extends Document {
  name: string;
  description: string;
  icon: string | null;
  type: RewardType;
  discountPct: number;
  discountFixed: number;
  freeItem: Types.ObjectId | null;
  xpBoostMultiplier: number;
  pointsAmount: number;
  code?: string;
  isPublic: boolean;
  usageLimit: number | null;
  usedCount: number;
  minOrderValue: number;
  startsAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  source: RewardSource;
  createdAt: Date;
  updatedAt: Date;
}

const RewardSchema = new Schema<IReward>({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  icon: { type: String, default: null },

  type: {
    type: String,
    enum: ['discount_pct', 'discount_fixed', 'free_item', 'xp_boost', 'points_grant', 'free_delivery'],
    required: true,
  },

  discountPct: { type: Number, default: 0, min: 0, max: 100 },
  discountFixed: { type: Number, default: 0, min: 0 },
  freeItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', default: null },
  xpBoostMultiplier: { type: Number, default: 1 },
  pointsAmount: { type: Number, default: 0 },

  code: { type: String, uppercase: true, trim: true, sparse: true, unique: true },
  isPublic: { type: Boolean, default: false },
  usageLimit: { type: Number, default: null },
  usedCount: { type: Number, default: 0 },
  minOrderValue: { type: Number, default: 0 },

  startsAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },

  source: {
    type: String,
    enum: ['spin_wheel', 'challenge_win', 'mission', 'referral', 'manual', 'level_up'],
    default: 'manual',
  },
}, { timestamps: true });

RewardSchema.index({ type: 1, isActive: 1 });

export const Reward: Model<IReward> =
  (mongoose.models.Reward as Model<IReward>) ||
  mongoose.model<IReward>('Reward', RewardSchema);
