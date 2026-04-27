import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok, badRequest } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth } from '@/lib/server/permissions';
import { Reward, type IReward } from '@/lib/db/models/reward';
import { UserReward } from '@/lib/db/models/userReward';
import { calcDiscount } from '@/lib/server/services/order.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;

    const body = await req.json();
    const code: string | undefined = body.code;
    const userRewardId: string | undefined = body.userRewardId;
    const orderTotal: number = Number(body.orderTotal) || 0;
    const deliveryFee: number = Number(body.deliveryFee) || 0;

    if (code) {
      const reward = await Reward.findOne({ code: String(code).toUpperCase(), isActive: true });
      if (!reward) return badRequest('Invalid or expired coupon');
      if (reward.expiresAt && reward.expiresAt < new Date()) return badRequest('Coupon has expired');
      if (reward.usageLimit && reward.usedCount >= reward.usageLimit) return badRequest('Coupon usage limit reached');
      if (orderTotal < reward.minOrderValue) return badRequest(`Minimum order value is $${reward.minOrderValue}`);

      const discountAmount = calcDiscount(reward, orderTotal, deliveryFee);
      return ok({ reward, discountAmount }, 'Coupon valid');
    }

    if (userRewardId) {
      const ur = await UserReward.findOne({ _id: userRewardId, user: user._id, status: 'active' })
        .populate<{ reward: IReward }>('reward');
      if (!ur) return badRequest('Reward not found or already used');
      if (!ur.reward) return badRequest('Invalid reward');
      if (ur.expiresAt && ur.expiresAt < new Date()) return badRequest('Reward has expired');
      if (ur.reward.expiresAt && ur.reward.expiresAt < new Date()) return badRequest('Reward has expired');

      const discountAmount = calcDiscount(ur.reward, orderTotal, deliveryFee);
      return ok({ reward: ur.reward, userRewardId: ur._id, discountAmount }, 'Reward valid');
    }

    return badRequest('Provide a coupon code or reward ID');
  } catch (e) {
    return handleError(e);
  }
}
