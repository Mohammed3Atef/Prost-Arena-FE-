import '@/lib/models';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { getSiteSettings } from '@/lib/db/models/siteSettings';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Public site settings — anyone may read. Used by every client to bootstrap branding. */
export async function GET() {
  try {
    await dbConnect();
    const s = await getSiteSettings();
    // Strip Mongoose internals + populate featuredItems lightly
    const populated = await s.populate({
      path: 'featuredItems',
      select: 'name description price image isAvailable category xpReward',
      match: { isAvailable: true },
    });
    return ok(populated.toJSON());
  } catch (e) {
    return handleError(e);
  }
}
