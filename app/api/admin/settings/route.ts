import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth, requireRole } from '@/lib/server/permissions';
import { getSiteSettings } from '@/lib/db/models/siteSettings';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_FIELDS = [
  'appName', 'logoUrl', 'brandColor', 'goldColor',
  // Hero (English + Arabic suffix counterparts)
  'heroBadge', 'heroBadgeAr',
  'heroTitle', 'heroTitleAr',
  'heroSubtitle', 'heroSubtitleAr',
  'heroPrimaryCta', 'heroSecondaryCta',
  // Feature cards / banners contain bilingual sub-fields inside their array elements
  'featureCards', 'banners', 'featuredItems',
  'dailyChallengeReward', 'xpPerLevelCoeff', 'deliveryFee', 'deliveryCities',
] as const;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const roleErr = requireRole(user, 'admin', 'superadmin');
    if (roleErr) return roleErr;

    const s = await getSiteSettings();
    const populated = await s.populate({
      path: 'featuredItems',
      select: 'name description price image isAvailable category',
    });
    return ok(populated.toJSON());
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const roleErr = requireRole(user, 'admin', 'superadmin');
    if (roleErr) return roleErr;

    const body = await req.json();
    const update: Record<string, unknown> = {};
    for (const k of ALLOWED_FIELDS) {
      if (k in body) update[k] = body[k];
    }

    if (typeof update.brandColor === 'string' && !HEX_RE.test(update.brandColor)) {
      throw Object.assign(new Error('brandColor must be a hex like #ff6b35'), {
        statusCode: 400, isOperational: true,
      });
    }
    if (typeof update.goldColor === 'string' && !HEX_RE.test(update.goldColor)) {
      throw Object.assign(new Error('goldColor must be a hex like #f59e0b'), {
        statusCode: 400, isOperational: true,
      });
    }

    update.updatedBy = user._id;

    const s = await getSiteSettings();
    // Use s.set() for each path so Mongoose properly tracks mutations,
    // including replacements of sub-document arrays (deliveryCities, banners,
    // featureCards). Object.assign skips Mongoose's internal path tracking
    // and can silently drop sub-document array changes on save.
    const ARRAY_PATHS = new Set(['deliveryCities', 'banners', 'featureCards', 'featuredItems']);
    for (const k of Object.keys(update)) {
      s.set(k, (update as Record<string, unknown>)[k]);
      if (ARRAY_PATHS.has(k)) s.markModified(k);
    }
    await s.save();

    const populated = await s.populate({
      path: 'featuredItems',
      select: 'name description price image isAvailable category',
    });
    return ok(populated.toJSON(), 'Settings updated');
  } catch (e) {
    return handleError(e);
  }
}
