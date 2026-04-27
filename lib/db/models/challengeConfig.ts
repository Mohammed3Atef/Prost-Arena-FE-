import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export const ALL_CATEGORIES = ['general', 'student', 'engineer', 'doctor', 'sports', 'food', 'culture'] as const;

export interface IChallengeConfig extends Document {
  isEnabled: boolean;
  maxAttemptsPerDay: number;
  enabledCategories: string[];
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ChallengeConfigSchema = new Schema<IChallengeConfig>({
  isEnabled: { type: Boolean, default: true },
  maxAttemptsPerDay: { type: Number, default: 1, min: 1, max: 50 },
  enabledCategories: { type: [String], default: [...ALL_CATEGORIES] },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

export const ChallengeConfig: Model<IChallengeConfig> =
  (mongoose.models.ChallengeConfig as Model<IChallengeConfig>) ||
  mongoose.model<IChallengeConfig>('ChallengeConfig', ChallengeConfigSchema);

export async function getConfig(): Promise<IChallengeConfig> {
  let cfg = await ChallengeConfig.findOne();
  if (!cfg) cfg = await ChallengeConfig.create({});
  return cfg;
}
