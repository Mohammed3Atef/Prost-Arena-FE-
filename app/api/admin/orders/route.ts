import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { paginated } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth, requireRole } from '@/lib/server/permissions';
import { Order } from '@/lib/db/models/order';

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
    const page = parseInt(sp.get('page') || '1', 10);
    const limit = Math.min(parseInt(sp.get('limit') || '20', 10), 100);
    const status = sp.get('status');
    const search = sp.get('search');

    const filter: any = {};
    if (status) filter.status = status;
    if (search) {
      const escaped = escapeRegex(search);
      filter.$or = [
        { orderNumber: { $regex: escaped, $options: 'i' } },
        { 'guestInfo.name': { $regex: escaped, $options: 'i' } },
        { 'guestInfo.email': { $regex: escaped, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('user', 'name email avatar').lean(),
      Order.countDocuments(filter),
    ]);
    return paginated(items, total, page, limit);
  } catch (e) {
    return handleError(e);
  }
}
