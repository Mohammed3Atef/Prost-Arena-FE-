import mongoose, { Schema, Model, Document, Types } from 'mongoose';

/**
 * Singleton document holding admin-controlled site content & branding.
 * Loaded with `getSiteSettings()` — auto-creates with defaults on first read.
 */

export interface IBanner {
  _id?:        Types.ObjectId;
  title:       string;
  subtitle:    string;
  image:       string | null;
  ctaLabel:    string;
  ctaUrl:      string;
  isActive:    boolean;
  sortOrder:   number;
}

export interface IFeatureCard {
  icon:        string;
  title:       string;
  desc:        string;
  href:        string;
  color:       string;
}

export interface IDeliveryCity {
  _id?:     Types.ObjectId;
  name:     string;
  fee:      number;
  isActive: boolean;
}

export interface ISiteSettings extends Document {
  // Branding
  appName:        string;
  logoUrl:        string;     // /logo or external CDN
  brandColor:     string;     // hex #RRGGBB
  goldColor:      string;     // hex #RRGGBB

  // Hero
  heroBadge:      string;
  heroTitle:      string;     // supports inline {{accent:...}} for the gradient word
  heroSubtitle:   string;
  heroPrimaryCta: { label: string; href: string };
  heroSecondaryCta: { label: string; href: string };

  // Feature cards
  featureCards:   IFeatureCard[];

  // Promo banners (for marketing strip)
  banners:        IBanner[];

  // Featured items (homepage/menu spotlight)
  featuredItems:  Types.ObjectId[];

  // Game rules
  dailyChallengeReward: { xp: number; points: number; discountPct: number };
  xpPerLevelCoeff: number;     // default 100; XP needed for level N = N² × coeff

  // Commerce
  deliveryFee: number;         // EGP fallback when no city is selected / matched
  deliveryCities: IDeliveryCity[];

  updatedBy:      Types.ObjectId | null;
  createdAt:      Date;
  updatedAt:      Date;
}

const BannerSchema = new Schema<IBanner>({
  title:       { type: String, required: true },
  subtitle:    { type: String, default: '' },
  image:       { type: String, default: null },
  ctaLabel:    { type: String, default: '' },
  ctaUrl:      { type: String, default: '' },
  isActive:    { type: Boolean, default: true },
  sortOrder:   { type: Number, default: 0 },
}, { _id: true });

const FeatureCardSchema = new Schema<IFeatureCard>({
  icon:  { type: String, required: true },
  title: { type: String, required: true },
  desc:  { type: String, default: '' },
  href:  { type: String, required: true },
  color: { type: String, default: 'from-brand-500 to-brand-600' },
}, { _id: false });

const DeliveryCitySchema = new Schema<IDeliveryCity>({
  name:     { type: String, required: true, trim: true },
  fee:      { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true },
}, { _id: true });

const DEFAULT_FEATURE_CARDS: IFeatureCard[] = [
  { icon: '🍔', title: 'Order & Earn XP',  desc: 'Every order levels you up', href: '/menu',        color: 'from-brand-500 to-brand-600'   },
  { icon: '⚡', title: 'Daily Challenges', desc: 'Win big discounts daily',   href: '/challenges',  color: 'from-gold-500 to-gold-600'     },
  { icon: '🎡', title: 'Spin the Wheel',   desc: 'Free daily spin awaits',    href: '/spin',        color: 'from-purple-500 to-purple-600' },
  { icon: '🏆', title: 'Leaderboard',      desc: 'Compete with the city',     href: '/leaderboard', color: 'from-green-500 to-green-600'   },
];

const SiteSettingsSchema = new Schema<ISiteSettings>({
  appName:    { type: String, default: 'Prost Arena' },
  logoUrl:    { type: String, default: '/Prost-arena-logo.png' },
  brandColor: { type: String, default: '#ff6b35' },
  goldColor:  { type: String, default: '#f59e0b' },

  heroBadge:    { type: String, default: '🎮 Gamified Food Experience' },
  heroTitle:    { type: String, default: 'EAT. PLAY. {{accent:WIN}}.' },
  heroSubtitle: { type: String, default: 'Order food, crush challenges, spin the wheel, and climb the leaderboard. Every meal is an adventure.' },
  heroPrimaryCta:   { label: { type: String, default: 'Start Ordering' },  href: { type: String, default: '/menu' } },
  heroSecondaryCta: { label: { type: String, default: 'Create Account' }, href: { type: String, default: '/register' } },

  featureCards: { type: [FeatureCardSchema], default: DEFAULT_FEATURE_CARDS },
  banners:      { type: [BannerSchema], default: [] },
  featuredItems:{ type: [{ type: Schema.Types.ObjectId, ref: 'MenuItem' }], default: [] },

  dailyChallengeReward: {
    xp:          { type: Number, default: 100 },
    points:      { type: Number, default: 50  },
    discountPct: { type: Number, default: 10  },
  },
  xpPerLevelCoeff: { type: Number, default: 100 },
  deliveryFee:     { type: Number, default: 15, min: 0 },
  deliveryCities:  { type: [DeliveryCitySchema], default: [] },

  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

// HMR-safe model registration. Next.js dev hot-reloads this module without
// clearing `mongoose.models`, which can leave a stale model whose schema
// predates fields we've since added. Detect that and re-register.
const EXPECTED_PATHS = ['deliveryFee', 'deliveryCities'];
if (mongoose.models.SiteSettings) {
  const existing = Object.keys(mongoose.models.SiteSettings.schema.paths);
  if (EXPECTED_PATHS.some((p) => !existing.includes(p))) {
    mongoose.deleteModel('SiteSettings');
  }
}

export const SiteSettings: Model<ISiteSettings> =
  (mongoose.models.SiteSettings as Model<ISiteSettings>) ||
  mongoose.model<ISiteSettings>('SiteSettings', SiteSettingsSchema);

export async function getSiteSettings(): Promise<ISiteSettings> {
  let s = await SiteSettings.findOne();
  if (!s) s = await SiteSettings.create({});
  return s;
}
