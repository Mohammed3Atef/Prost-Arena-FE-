import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok, notFound, forbidden } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth } from '@/lib/server/permissions';
import { Order } from '@/lib/db/models/order';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;

    const { id } = await params;
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';

    let q = Order.findById(id).populate('user', 'name email phone avatar level');
    if (isAdmin) {
      // Admin needs the full coupon detail + item images for the detail page.
      q = q
        .populate('couponReward', 'name code type discountPct discountFixed source')
        .populate('items.menuItem', 'image');
    }
    const order: any = await q.lean();
    if (!order) return notFound();

    if (user.role === 'user' && order.user?._id?.toString() !== user._id.toString()) {
      return forbidden();
    }

    return ok(order);
  } catch (e) {
    return handleError(e);
  }
}
