import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface IAddOnOption {
  name: string;
  price: number;
}

export interface IAddOnGroup {
  name: string;
  required: boolean;
  multiple: boolean;
  options: IAddOnOption[];
}

export interface IMenuItem extends Document {
  name: string;
  description: string;
  image: string | null;
  price: number;
  category: Types.ObjectId;
  addOnGroups: IAddOnGroup[];
  isAvailable: boolean;
  isSecret: boolean;
  requiredLevel: number;
  tags: string[];
  calories: number | null;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  xpReward: number;
  ordersCount: number;
  rating: number;
  ratingsCount: number;
  sortOrder: number;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  softDelete(): Promise<IMenuItem>;
}

const AddOnGroupSchema = new Schema<IAddOnGroup>({
  name: { type: String, required: true },
  required: { type: Boolean, default: false },
  multiple: { type: Boolean, default: false },
  options: [{
    name: { type: String, required: true },
    price: { type: Number, required: true, default: 0 },
  }],
}, { _id: false });

const MenuItemSchema = new Schema<IMenuItem>({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  image: { type: String, default: null },
  price: { type: Number, required: true, min: 0 },

  category: {
    type: Schema.Types.ObjectId,
    ref: 'MenuCategory',
    required: true,
  },

  addOnGroups: { type: [AddOnGroupSchema], default: [] },

  isAvailable: { type: Boolean, default: true },
  isSecret: { type: Boolean, default: false },
  requiredLevel: { type: Number, default: 1 },

  tags: [{ type: String }],
  calories: { type: Number, default: null },
  isVegetarian: { type: Boolean, default: false },
  isVegan: { type: Boolean, default: false },
  isGlutenFree: { type: Boolean, default: false },

  xpReward: { type: Number, default: 10 },

  ordersCount: { type: Number, default: 0 },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  ratingsCount: { type: Number, default: 0 },

  sortOrder: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

MenuItemSchema.index({ category: 1, isAvailable: 1, isDeleted: 1 });
MenuItemSchema.index({ tags: 1 });
MenuItemSchema.index({ isSecret: 1, requiredLevel: 1 });

MenuItemSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

MenuItemSchema.pre(/^find/, function (this: any, next) {
  if (this.getOptions().includeDeleted) return next();
  this.where({ isDeleted: false });
  next();
});

export const MenuItem: Model<IMenuItem> =
  (mongoose.models.MenuItem as Model<IMenuItem>) ||
  mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);
