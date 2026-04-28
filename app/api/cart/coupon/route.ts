import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError, operationalError } from '@/lib/server/error';
import { requireAuth } from '@/lib/server/permissions';
import { Cart } from '@/lib/db/models/cart';
import { Reward } from '@/lib/db/models/reward';
import { UserReward } from '@/lib/db/models/userReward';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Apply a coupon code or a UserReward id to the cart. */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;

    const body = await req.json();
    const code: string | undefined = body.code?.toString().trim().toUpperCase();
    const userRewardId: string | undefined = body.userRewardId;

    const cart = await Cart.findOne({ user: user._id });
    if (!cart) throw operationalError('Cart not found', 404);

    const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);

    let discount = 0;
    if (userRewardId) {
      const ur: any = await UserReward.findOne({ _id: userRewardId, user: user._id, status: 'active' }).populate('reward').lean();
      if (!ur || !ur.reward) throw operationalError('Reward unavailable', 404);
      discount = computeDiscount(ur.reward, subtotal);
      cart.couponCode   = null;
      cart.userRewardId = ur._id;
    } else if (code) {
      const reward: any = await Reward.findOne({ code, isActive: true }).lean();
      if (!reward) throw operationalError('Invalid or expired coupon', 400);
      discount = computeDiscount(reward, subtotal);
      cart.couponCode   = code;
      cart.userRewardId = null;
    } else {
      throw operationalError('Provide a coupon code or userRewardId', 400);
    }
    cart.discount = discount;
    await cart.save();
    return ok(cart.toJSON());
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const cart = await Cart.findOne({ user: user._id });
    if (!cart) throw operationalError('Cart not found', 404);
    cart.couponCode = null;
    cart.userRewardId = null;
    cart.discount = 0;
    await cart.save();
    return ok(cart.toJSON());
  } catch (e) {
    return handleError(e);
  }
}

function computeDiscount(reward: any, subtotal: number): number {
  switch (reward.type) {
    case 'discount_pct':
      return Math.round((subtotal * (reward.discountPct || 0)) / 100 * 100) / 100;
    case 'discount_fixed':
      return Math.min(Number(reward.discountFixed) || 0, subtotal);
    case 'free_delivery':
      return 0;
    default:
      return 0;
  }
}
