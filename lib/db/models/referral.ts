import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface IReferral extends Document {
  referrer: Types.ObjectId;
  referred: Types.ObjectId;
  code: string;
  status: 'pending' | 'rewarded' | 'failed';
  referrerReward: Types.ObjectId | null;
  referredReward: Types.ObjectId | null;
  rewardedAt: Date | null;
  qualifyingOrder: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralSchema = new Schema<IReferral>({
  referrer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  referred: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  code: { type: String, required: true },

  status: {
    type: String,
    enum: ['pending', 'rewarded', 'failed'],
    default: 'pending',
  },

  referrerReward: { type: Schema.Types.ObjectId, ref: 'UserReward', default: null },
  referredReward: { type: Schema.Types.ObjectId, ref: 'UserReward', default: null },
  rewardedAt: { type: Date, default: null },

  qualifyingOrder: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
}, { timestamps: true });

ReferralSchema.index({ referrer: 1 });
ReferralSchema.index({ referred: 1 }, { unique: true });
ReferralSchema.index({ code: 1 });

export const Referral: Model<IReferral> =
  (mongoose.models.Referral as Model<IReferral>) ||
  mongoose.model<IReferral>('Referral', ReferralSchema);
