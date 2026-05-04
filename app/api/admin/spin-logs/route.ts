import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth, requireRole } from '@/lib/server/permissions';
import { SpinLog } from '@/lib/db/models/spinWheel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/spin-logs
 *   ?page=1&limit=20         — pagination (default 20, max 100)
 *   ?userId=<id>             — filter to one user
 *   ?segmentType=reward|xp_boost|points|empty — filter by segment outcome
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD — date range (createdAt)
 *
 * Each row is enriched with user (name/email) and reward (name/code/type).
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const roleErr = requireRole(user, 'admin', 'superadmin');
    if (roleErr) return roleErr;

    const sp = req.nextUrl.searchParams;
    const page  = Math.max(1, Number(sp.get('page'))  || 1);
    const limit = Math.min(100, Math.max(1, Number(sp.get('limit')) || 20));
    const filter: any = {};

    const userId      = sp.get('userId');
    const from        = sp.get('from');
    const to          = sp.get('to');

    if (userId) filter.user = userId;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      SpinLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email level')
        .populate('reward', 'name code type discountPct discountFixed')
        .lean(),
      SpinLog.countDocuments(filter),
    ]);

    return ok({ items, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (e) {
    return handleError(e);
  }
}
