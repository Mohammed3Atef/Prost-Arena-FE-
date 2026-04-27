import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { paginated, created } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth, requireRole } from '@/lib/server/permissions';
import { Reward } from '@/lib/db/models/reward';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const roleErr = requireRole(user, 'admin', 'superadmin');
    if (roleErr) return roleErr;

    const sp = req.nextUrl.searchParams;
    const page = parseInt(sp.get('page') || '1', 10);
    const limit = Math.min(parseInt(sp.get('limit') || '20', 10), 100);
    const type = sp.get('type');

    const filter: any = {};
    if (type) filter.type = type;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Reward.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Reward.countDocuments(filter),
    ]);
    return paginated(items, total, page, limit);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const roleErr = requireRole(user, 'admin', 'superadmin');
    if (roleErr) return roleErr;

    const body = await req.json();
    const reward = await Reward.create(body);
    return created(reward);
  } catch (e) {
    return handleError(e);
  }
}
