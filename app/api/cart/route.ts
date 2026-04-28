import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth } from '@/lib/server/permissions';
import { Cart } from '@/lib/db/models/cart';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function loadOrCreateCart(userId: string) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const cart = await loadOrCreateCart(user._id.toString());
    return ok(cart.toJSON());
  } catch (e) {
    return handleError(e);
  }
}

/** Clear the cart entirely. */
export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const cart = await loadOrCreateCart(user._id.toString());
    cart.items = [];
    cart.couponCode = null;
    cart.userRewardId = null;
    cart.discount = 0;
    await cart.save();
    return ok(cart.toJSON(), 'Cart cleared');
  } catch (e) {
    return handleError(e);
  }
}
