import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface IOrderItem {
  menuItem: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  addOns: { name: string; price: number }[];
  specialNote: string;
  subtotal: number;
}

export interface IStatusEntry {
  status: string;
  timestamp: Date;
  note?: string;
}

export interface IDeliveryAddress {
  street?: string;
  city?: string;
  zip?: string;
  coords?: { lat: number; lng: number };
}

export interface IOrder extends Document {
  user: Types.ObjectId | null;
  guestInfo?: { name?: string; email?: string; phone?: string };
  items: IOrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  couponCode: string | null;
  couponReward: Types.ObjectId | null;
  pointsUsed: number;
  type: 'dine-in' | 'takeaway' | 'delivery';
  deliveryAddress?: IDeliveryAddress;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  statusHistory: IStatusEntry[];
  xpAwarded: number;
  pointsAwarded: number;
  xpAwardedAt: Date | null;
  paymentMethod: 'cash' | 'card' | 'points' | 'mixed';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentRef: string | null;
  orderNumber: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  addOns: [{ name: String, price: Number }],
  specialNote: { type: String, default: '' },
  subtotal: { type: Number, required: true },
}, { _id: false });

const OrderSchema = new Schema<IOrder>({
  user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  guestInfo: {
    name: { type: String },
    email: { type: String },
    phone: { type: String },
  },

  items: { type: [OrderItemSchema], required: true },

  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  total: { type: Number, required: true },

  couponCode: { type: String, default: null },
  couponReward: { type: Schema.Types.ObjectId, ref: 'Reward', default: null },
  pointsUsed: { type: Number, default: 0 },

  type: {
    type: String,
    enum: ['dine-in', 'takeaway', 'delivery'],
    default: 'takeaway',
  },
  deliveryAddress: {
    street: String,
    city: String,
    zip: String,
    coords: { lat: Number, lng: Number },
  },

  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending',
  },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
  }],

  xpAwarded: { type: Number, default: 0 },
  pointsAwarded: { type: Number, default: 0 },
  xpAwardedAt: { type: Date, default: null },

  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'points', 'mixed'],
    default: 'cash',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending',
  },
  paymentRef: { type: String, default: null },

  orderNumber: { type: String, unique: true },
  notes: { type: String, default: '' },
}, { timestamps: true });

OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ status: 1 });

OrderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderNumber = `PA-${ts}-${rand}`;
  }
  next();
});

export const Order: Model<IOrder> =
  (mongoose.models.Order as Model<IOrder>) ||
  mongoose.model<IOrder>('Order', OrderSchema);
