import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface IQuestion extends Document {
  text: string;
  category: 'general' | 'student' | 'engineer' | 'doctor' | 'sports' | 'food' | 'culture';
  difficulty: 'easy' | 'medium' | 'hard';
  options: string[];
  correctIndex: number;
  explanation: string;
  isAiGenerated: boolean;
  aiModel: string | null;
  timesUsed: number;
  correctRate: number;
  isActive: boolean;
  createdBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
  text: { type: String, required: true, trim: true },

  category: {
    type: String,
    enum: ['general', 'student', 'engineer', 'doctor', 'sports', 'food', 'culture'],
    default: 'general',
    index: true,
  },

  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },

  options: {
    type: [{ type: String, required: true }],
    validate: [(v: string[]) => v.length >= 2 && v.length <= 6, 'Must have 2–6 options'],
  },

  correctIndex: { type: Number, required: true, min: 0 },

  explanation: { type: String, default: '' },

  isAiGenerated: { type: Boolean, default: false },
  aiModel: { type: String, default: null },

  timesUsed: { type: Number, default: 0 },
  correctRate: { type: Number, default: 0 },

  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

QuestionSchema.index({ category: 1, difficulty: 1, isActive: 1 });

export const Question: Model<IQuestion> =
  (mongoose.models.Question as Model<IQuestion>) ||
  mongoose.model<IQuestion>('Question', QuestionSchema);
