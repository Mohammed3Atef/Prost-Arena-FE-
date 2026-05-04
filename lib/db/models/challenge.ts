import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface IChallengeAnswer {
  questionId: string;
  answeredIndex: number;
  isCorrect: boolean;
  answeredAt: Date;
}

export interface IParticipant {
  user: Types.ObjectId;
  score: number;
  answers: IChallengeAnswer[];
  isReady: boolean;
  isFinished: boolean;
  finishedAt: Date | null;
}

export interface IChallengeReward {
  xp: number;
  points: number;
  discountPct: number;
  freeItem: Types.ObjectId | null;
}

export interface IChallenge extends Document {
  type: 'daily' | 'pvp' | 'category';
  category: 'general' | 'student' | 'engineer' | 'doctor' | 'sports' | 'food' | 'culture';
  questions: Types.ObjectId[];
  participants: IParticipant[];
  maxParticipants: number;
  status: 'waiting' | 'active' | 'completed' | 'cancelled' | 'expired';
  startedAt: Date | null;
  completedAt: Date | null;
  expiresAt: Date | null;
  timeLimit: number;
  reward: IChallengeReward;
  winner: Types.ObjectId | null;
  date: string | null;
  /** Admin-controlled flag. Only one active challenge per (type, category) is served to customers. */
  isActive: boolean;
  /** For per-day customer instances: the admin template this instance was cloned from.
   *  Null on the templates themselves. Used to invalidate stale instances when the
   *  active template changes for the day's category. */
  templateId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantSchema = new Schema<IParticipant>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  score: { type: Number, default: 0 },
  answers: [{ questionId: String, answeredIndex: Number, isCorrect: Boolean, answeredAt: Date }],
  isReady: { type: Boolean, default: false },
  isFinished: { type: Boolean, default: false },
  finishedAt: { type: Date, default: null },
}, { _id: false });

const ChallengeSchema = new Schema<IChallenge>({
  type: { type: String, enum: ['daily', 'pvp', 'category'], required: true },

  category: {
    type: String,
    enum: ['general', 'student', 'engineer', 'doctor', 'sports', 'food', 'culture'],
    default: 'general',
  },

  questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],

  participants: { type: [ParticipantSchema], default: [] },
  maxParticipants: { type: Number, default: 2 },

  status: {
    type: String,
    enum: ['waiting', 'active', 'completed', 'cancelled', 'expired'],
    default: 'waiting',
  },

  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
  timeLimit: { type: Number, default: 30 },

  reward: {
    xp: { type: Number, default: 50 },
    points: { type: Number, default: 20 },
    discountPct: { type: Number, default: 0 },
    freeItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', default: null },
  },
  winner: { type: Schema.Types.ObjectId, ref: 'User', default: null },

  date: { type: String, default: null },
  isActive: { type: Boolean, default: false },
  templateId: { type: Schema.Types.ObjectId, ref: 'Challenge', default: null, index: true },
}, { timestamps: true });

ChallengeSchema.index({ type: 1, status: 1 });
ChallengeSchema.index({ date: 1, category: 1, type: 1 });
ChallengeSchema.index({ type: 1, category: 1, isActive: 1 });
ChallengeSchema.index({ 'participants.user': 1 });

// HMR-safe model registration. Next dev hot-reloads can leave a cached model
// with an outdated schema; force re-register if expected paths are missing.
const EXPECTED_CHALLENGE_PATHS = ['questions', 'reward', 'timeLimit', 'isActive', 'templateId'];
if (mongoose.models.Challenge) {
  const existing = Object.keys(mongoose.models.Challenge.schema.paths);
  if (EXPECTED_CHALLENGE_PATHS.some((p) => !existing.includes(p))) {
    mongoose.deleteModel('Challenge');
  }
}

export const Challenge: Model<IChallenge> =
  (mongoose.models.Challenge as Model<IChallenge>) ||
  mongoose.model<IChallenge>('Challenge', ChallengeSchema);
