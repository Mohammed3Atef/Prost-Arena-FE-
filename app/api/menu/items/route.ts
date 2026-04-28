import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { paginated, created } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { optionalAuth, requireAuth, requireRole } from '@/lib/server/permissions';
import { MenuItem } from '@/lib/db/models/menuItem';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    // optionalAuth kept for any future per-user logic (still tells us who's viewing).
    await optionalAuth(req);

    const sp = req.nextUrl.searchParams;
    const category = sp.get('category');
    const search = sp.get('search');
    const page = parseInt(sp.get('page') || '1', 10);
    const limit = Math.min(parseInt(sp.get('limit') || '40', 10), 100);

    // Secret items are returned even if the user can't unlock them yet — the
    // client shows them blurred and disabled to motivate level-up.
    const filter: any = { isAvailable: true };
    if (category) filter.category = category;
    if (search) filter.name = { $regex: escapeRegex(search), $options: 'i' };

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      MenuItem.find(filter).sort('sortOrder').skip(skip).limit(limit)
        .populate('category', 'name slug icon').lean(),
      MenuItem.countDocuments(filter),
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
    const item = await MenuItem.create(body);
    return created(item);
  } catch (e) {
    return handleError(e);
  }
}
