import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export type MissionType =
  | 'order_count'
  | 'order_new_item'
  | 'challenge_win'
  | 'referral'
  | 'spin'
  | 'login_streak'
  | 'spend_amount';

export interface IMissionReward {
  xp: number;
  points: number;
  rewardId: Types.ObjectId | null;
}

export interface IMission extends Document {
  title: string;
  description: string;
  icon: string | null;
  type: MissionType;
  target: number;
  targetRef: Types.ObjectId | null;
  reward: IMissionReward;
  isRepeatable: boolean;
  repeatEvery: 'daily' | 'weekly' | 'monthly' | null;
  sortOrder: number;
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMission extends Document {
  user: Types.ObjectId;
  mission: Types.ObjectId;
  progress: number;
  status: 'active' | 'completed' | 'claimed' | 'expired';
  completedAt: Date | null;
  claimedAt: Date | null;
  periodKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const MissionSchema = new Schema<IMission>({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  icon: { type: String, default: null },

  type: {
    type: String,
    enum: ['order_count', 'order_new_item', 'challenge_win', 'referral', 'spin', 'login_streak', 'spend_amount'],
    required: true,
  },

  target: { type: Number, required: true },
  targetRef: { type: Schema.Types.ObjectId, default: null },

  reward: {
    xp: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    rewardId: { type: Schema.Types.ObjectId, ref: 'Reward', default: null },
  },

  isRepeatable: { type: Boolean, default: false },
  repeatEvery: { type: String, enum: ['daily', 'weekly', 'monthly', null], default: null },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
}, { timestamps: true });

const UserMissionSchema = new Schema<IUserMission>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  mission: { type: Schema.Types.ObjectId, ref: 'Mission', required: true },
  progress: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['active', 'completed', 'claimed', 'expired'],
    default: 'active',
  },

  completedAt: { type: Date, default: null },
  claimedAt: { type: Date, default: null },
  periodKey: { type: String, default: null },
}, { timestamps: true });

UserMissionSchema.index({ user: 1, status: 1 });
UserMissionSchema.index({ user: 1, mission: 1, periodKey: 1 }, { unique: true });

export const Mission: Model<IMission> =
  (mongoose.models.Mission as Model<IMission>) ||
  mongoose.model<IMission>('Mission', MissionSchema);

export const UserMission: Model<IUserMission> =
  (mongoose.models.UserMission as Model<IUserMission>) ||
  mongoose.model<IUserMission>('UserMission', UserMissionSchema);
