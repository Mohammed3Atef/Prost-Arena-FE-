import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { paginated } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth, requireRole } from '@/lib/server/permissions';
import { MenuItem } from '@/lib/db/models/menuItem';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const roleErr = requireRole(user, 'admin', 'superadmin');
    if (roleErr) return roleErr;

    const sp = req.nextUrl.searchParams;
    const search = sp.get('search');
    const category = sp.get('category');
    const page = parseInt(sp.get('page') || '1', 10);
    const limit = Math.min(parseInt(sp.get('limit') || '50', 10), 200);

    const filter: any = {};
    if (search) filter.name = { $regex: escapeRegex(search), $options: 'i' };
    if (category) filter.category = category;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      MenuItem.find(filter).sort('sortOrder').skip(skip).limit(limit)
        .populate('category', 'name icon').lean(),
      MenuItem.countDocuments(filter),
    ]);

    return paginated(items, total, page, limit);
  } catch (e) {
    return handleError(e);
  }
}
