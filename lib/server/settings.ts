import 'server-only';
import { dbConnect } from '@/lib/db/mongoose';
import { getSiteSettings, type ISiteSettings } from '@/lib/db/models/siteSettings';
import { deriveShades, shadesToCssVars } from '@/lib/colorShades';

export type PublicSiteSettings = {
  appName:        string;
  logoUrl:        string;
  brandColor:     string;
  goldColor:      string;
  heroBadge:      string;
  heroBadgeAr:    string;
  heroTitle:      string;
  heroTitleAr:    string;
  heroSubtitle:   string;
  heroSubtitleAr: string;
  heroPrimaryCta:   { label: string; labelAr: string; href: string };
  heroSecondaryCta: { label: string; labelAr: string; href: string };
  featureCards:   ISiteSettings['featureCards'];
  banners:        ISiteSettings['banners'];
  featuredItems:  unknown[];
  dailyChallengeReward: ISiteSettings['dailyChallengeReward'];
  xpPerLevelCoeff: number;
  deliveryFee:     number;
  deliveryCities:  Array<{ _id?: string; name: string; fee: number; isActive: boolean }>;
};

const FALLBACK: PublicSiteSettings = {
  appName:        'Prost Arena',
  logoUrl:        '/Prost-arena-logo.png',
  brandColor:     '#ff6b35',
  goldColor:      '#f59e0b',
  heroBadge:      '🎮 Gamified Food Experience',
  heroBadgeAr:    '',
  heroTitle:      'EAT. PLAY. {{accent:WIN}}.',
  heroTitleAr:    '',
  heroSubtitle:   'Order food, crush challenges, spin the wheel, and climb the leaderboard. Every meal is an adventure.',
  heroSubtitleAr: '',
  heroPrimaryCta:   { label: 'Start Ordering',  labelAr: '', href: '/menu' },
  heroSecondaryCta: { label: 'Create Account',  labelAr: '', href: '/register' },
  featureCards:   [
    { icon: '🍔', title: 'Order & Earn XP',  titleAr: '', desc: 'Every order levels you up', descAr: '', href: '/menu',        color: 'from-brand-500 to-brand-600'   },
    { icon: '⚡', title: 'Daily Challenges', titleAr: '', desc: 'Win big discounts daily',   descAr: '', href: '/challenges',  color: 'from-gold-500 to-gold-600'     },
    { icon: '🎡', title: 'Spin the Wheel',   titleAr: '', desc: 'Free daily spin awaits',    descAr: '', href: '/spin',        color: 'from-purple-500 to-purple-600' },
    { icon: '🏆', title: 'Leaderboard',      titleAr: '', desc: 'Compete with the city',     descAr: '', href: '/leaderboard', color: 'from-green-500 to-green-600'   },
  ],
  banners:        [],
  featuredItems:  [],
  dailyChallengeReward: { xp: 100, points: 50, discountPct: 10 },
  xpPerLevelCoeff: 100,
  deliveryFee:     15,
  deliveryCities:  [],
};

/**
 * Deep-serialize a Mongoose-hydrated object to plain JSON-safe data.
 * Strips Buffer-backed ObjectIds (and any other class instances) which
 * React Server → Client boundary refuses to serialize automatically.
 */
function toPlain<T>(input: unknown): T {
  return JSON.parse(JSON.stringify(input)) as T;
}

/**
 * Load site settings on the server. Falls back to safe defaults if the DB
 * is unreachable so the site still renders during outages or build steps.
 */
export async function loadServerSettings(): Promise<PublicSiteSettings> {
  try {
    await dbConnect();
    const s = await getSiteSettings();
    const populated = await s.populate({
      path: 'featuredItems',
      select: 'name description price image isAvailable category xpReward',
      match: { isAvailable: true },
    });
    const json = toPlain<PublicSiteSettings>(populated);
    return {
      ...FALLBACK,
      ...json,
      heroPrimaryCta:   { ...FALLBACK.heroPrimaryCta,   ...(json.heroPrimaryCta ?? {}) },
      heroSecondaryCta: { ...FALLBACK.heroSecondaryCta, ...(json.heroSecondaryCta ?? {}) },
      featureCards:     json.featureCards?.length ? json.featureCards : FALLBACK.featureCards,
      dailyChallengeReward: { ...FALLBACK.dailyChallengeReward, ...(json.dailyChallengeReward ?? {}) },
    };
  } catch {
    return FALLBACK;
  }
}

/** Build a `<style>` rule body that defines the brand and gold CSS variables. */
export function buildThemeCssVars(settings: Pick<PublicSiteSettings, 'brandColor' | 'goldColor'>): string {
  const brand = shadesToCssVars('brand', deriveShades(settings.brandColor));
  const gold  = shadesToCssVars('gold',  deriveShades(settings.goldColor));
  return `:root{${brand}${gold}}`;
}
