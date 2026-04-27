import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export type SpinSegmentType = 'reward' | 'xp_boost' | 'points' | 'empty' | 'free_item';

export interface ISpinSegment {
  label: string;
  type: SpinSegmentType;
  reward: Types.ObjectId | null;
  xpAmount: number;
  pointsAmount: number;
  probability: number;
  color: string;
  icon: string | null;
}

export interface ISpinWheelConfig extends Document {
  name: string;
  segments: ISpinSegment[];
  isActive: boolean;
  spinCooldownHours: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISpinLog extends Document {
  user: Types.ObjectId;
  wheel: Types.ObjectId;
  segmentIndex: number;
  segmentLabel: string;
  reward: Types.ObjectId | null;
  userReward: Types.ObjectId | null;
  xpAwarded: number;
  pointsAwarded: number;
  createdAt: Date;
  updatedAt: Date;
}

const SpinSegmentSchema = new Schema<ISpinSegment>({
  label: { type: String, required: true },
  type: { type: String, enum: ['reward', 'xp_boost', 'points', 'empty', 'free_item'], required: true },
  reward: { type: Schema.Types.ObjectId, ref: 'Reward', default: null },
  xpAmount: { type: Number, default: 0 },
  pointsAmount: { type: Number, default: 0 },
  probability: { type: Number, required: true, min: 0, max: 1 },
  color: { type: String, default: '#FF6B35' },
  icon: { type: String, default: null },
}, { _id: false });

const SpinWheelConfigSchema = new Schema<ISpinWheelConfig>({
  name: { type: String, default: 'Default Wheel' },
  segments: { type: [SpinSegmentSchema], required: true },
  isActive: { type: Boolean, default: true },
  spinCooldownHours: { type: Number, default: 24 },
}, { timestamps: true });

const SpinLogSchema = new Schema<ISpinLog>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  wheel: { type: Schema.Types.ObjectId, ref: 'SpinWheelConfig', required: true },
  segmentIndex: { type: Number, required: true },
  segmentLabel: { type: String, required: true },
  reward: { type: Schema.Types.ObjectId, ref: 'Reward', default: null },
  userReward: { type: Schema.Types.ObjectId, ref: 'UserReward', default: null },
  xpAwarded: { type: Number, default: 0 },
  pointsAwarded: { type: Number, default: 0 },
}, { timestamps: true });

SpinLogSchema.index({ user: 1, createdAt: -1 });

export const SpinWheelConfig: Model<ISpinWheelConfig> =
  (mongoose.models.SpinWheelConfig as Model<ISpinWheelConfig>) ||
  mongoose.model<ISpinWheelConfig>('SpinWheelConfig', SpinWheelConfigSchema);

export const SpinLog: Model<ISpinLog> =
  (mongoose.models.SpinLog as Model<ISpinLog>) ||
  mongoose.model<ISpinLog>('SpinLog', SpinLogSchema);
