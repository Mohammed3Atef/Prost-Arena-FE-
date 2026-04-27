import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { created, paginated } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { optionalAuth, requireAuth } from '@/lib/server/permissions';
import { createOrder, getOrders } from '@/lib/server/services/order.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const user = await optionalAuth(req);
    const body = await req.json();
    const order = await createOrder(body, user ? user._id : null);
    return created(order, 'Order placed');
  } catch (e) {
    return handleError(e);
  }
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;

    const sp = req.nextUrl.searchParams;
    const page = parseInt(sp.get('page') || '1', 10);
    const limit = Math.min(parseInt(sp.get('limit') || '20', 10), 100);
    const status = sp.get('status') || undefined;

    const userId = ['admin', 'superadmin'].includes(user.role) ? undefined : user._id;
    const { items, total } = await getOrders({ page, limit, status, userId });
    return paginated(items, total, page, limit);
  } catch (e) {
    return handleError(e);
  }
}
