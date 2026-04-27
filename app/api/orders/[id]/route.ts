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
    const order: any = await Order.findById(id).populate('user', 'name avatar level').lean();
    if (!order) return notFound();

    if (user.role === 'user' && order.user?._id?.toString() !== user._id.toString()) {
      return forbidden();
    }

    return ok(order);
  } catch (e) {
    return handleError(e);
  }
}
