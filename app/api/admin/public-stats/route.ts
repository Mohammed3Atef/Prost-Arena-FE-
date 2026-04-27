import '@/lib/models';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { User } from '@/lib/db/models/user';
import { Order } from '@/lib/db/models/order';
import { UserReward } from '@/lib/db/models/userReward';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    await dbConnect();
    const [totalUsers, totalOrders, totalRewards] = await Promise.all([
      User.countDocuments(),
      Order.countDocuments({ status: 'delivered' }),
      UserReward.countDocuments(),
    ]);
    return ok({ totalUsers, totalOrders, totalRewards });
  } catch (e) {
    return handleError(e);
  }
}
