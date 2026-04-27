import mongoose, { Schema, Model, Document, Types } from 'mongoose';
import type { RewardSource } from './reward';

export interface IUserReward extends Document {
  user: Types.ObjectId;
  reward: Types.ObjectId;
  status: 'active' | 'used' | 'expired';
  usedOnOrder: Types.ObjectId | null;
  usedAt: Date | null;
  expiresAt: Date | null;
  source: RewardSource;
  createdAt: Date;
  updatedAt: Date;
}

const UserRewardSchema = new Schema<IUserReward>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reward: { type: Schema.Types.ObjectId, ref: 'Reward', required: true },

  status: {
    type: String,
    enum: ['active', 'used', 'expired'],
    default: 'active',
  },

  usedOnOrder: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
  usedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },

  source: {
    type: String,
    enum: ['spin_wheel', 'challenge_win', 'mission', 'referral', 'manual', 'level_up'],
    default: 'manual',
  },
}, { timestamps: true });

UserRewardSchema.index({ user: 1, status: 1 });
UserRewardSchema.index({ user: 1, reward: 1 });

export const UserReward: Model<IUserReward> =
  (mongoose.models.UserReward as Model<IUserReward>) ||
  mongoose.model<IUserReward>('UserReward', UserRewardSchema);
