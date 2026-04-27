import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IOtpCode extends Document {
  phone: string;
  code: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const OtpCodeSchema = new Schema<IOtpCode>({
  phone: { type: String, required: true, index: true },
  code: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

// TTL: documents are auto-removed when `expiresAt` is reached.
OtpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpCode: Model<IOtpCode> =
  (mongoose.models.OtpCode as Model<IOtpCode>) ||
  mongoose.model<IOtpCode>('OtpCode', OtpCodeSchema);
