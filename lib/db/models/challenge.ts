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
}, { timestamps: true });

ChallengeSchema.index({ type: 1, status: 1 });
ChallengeSchema.index({ date: 1, category: 1, type: 1 });
ChallengeSchema.index({ 'participants.user': 1 });

export const Challenge: Model<IChallenge> =
  (mongoose.models.Challenge as Model<IChallenge>) ||
  mongoose.model<IChallenge>('Challenge', ChallengeSchema);
