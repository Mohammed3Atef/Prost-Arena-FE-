import mongoose, { Schema, Model, Document, Types } from 'mongoose';

/**
 * Server-backed cart — one document per user. Replaces the previous
 * client-only Zustand persist cart so users see the same cart across devices.
 *
 * `lineId` is a deterministic key built from menuItem + addOn names so adding
 * the same item twice (with the same modifiers) increments the quantity
 * instead of creating a duplicate line.
 */

export interface ICartItem {
  lineId:      string;
  menuItem:    Types.ObjectId;
  name:        string;
  price:       number;     // unit price including addOns
  quantity:    number;
  addOns:      { name: string; price: number }[];
  specialNote: string;
  image:       string | null;
}

export interface ICart extends Document {
  user:         Types.ObjectId;
  items:        ICartItem[];
  couponCode:   string | null;
  userRewardId: Types.ObjectId | null;
  discount:     number;
  createdAt:    Date;
  updatedAt:    Date;
}

const CartItemSchema = new Schema<ICartItem>({
  lineId:      { type: String, required: true },
  menuItem:    { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name:        { type: String, required: true },
  price:       { type: Number, required: true, min: 0 },
  quantity:    { type: Number, required: true, min: 1 },
  addOns:      [{ name: { type: String, required: true }, price: { type: Number, default: 0 } }],
  specialNote: { type: String, default: '' },
  image:       { type: String, default: null },
}, { _id: false });

const CartSchema = new Schema<ICart>({
  user:         { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  items:        { type: [CartItemSchema], default: [] },
  couponCode:   { type: String, default: null },
  userRewardId: { type: Schema.Types.ObjectId, ref: 'UserReward', default: null },
  discount:     { type: Number, default: 0, min: 0 },
}, { timestamps: true });

export const Cart: Model<ICart> =
  (mongoose.models.Cart as Model<ICart>) || mongoose.model<ICart>('Cart', CartSchema);

export function lineIdFor(menuItemId: string, addOns: Array<{ name: string }>): string {
  return `${menuItemId}-${addOns.map((a) => a.name).join('+')}`;
}
