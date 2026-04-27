import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IMenuCategory extends Document {
  name: string;
  slug: string;
  description: string;
  image: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MenuCategorySchema = new Schema<IMenuCategory>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, default: '' },
  image: { type: String, default: null },
  icon: { type: String, default: null },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

MenuCategorySchema.index({ sortOrder: 1 });

export const MenuCategory: Model<IMenuCategory> =
  (mongoose.models.MenuCategory as Model<IMenuCategory>) ||
  mongoose.model<IMenuCategory>('MenuCategory', MenuCategorySchema);
