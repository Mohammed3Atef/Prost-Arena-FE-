import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError, operationalError } from '@/lib/server/error';
import { requireAuth } from '@/lib/server/permissions';
import { Cart } from '@/lib/db/models/cart';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

/** PATCH: set quantity (0 removes). DELETE: remove the line. `id` is the lineId. */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;

    const { id } = await params;
    const body = await req.json();
    const quantity = Math.max(0, Math.floor(Number(body.quantity ?? 0)));

    const cart = await Cart.findOne({ user: user._id });
    if (!cart) throw operationalError('Cart not found', 404);

    if (quantity === 0) {
      cart.items = cart.items.filter((i) => i.lineId !== id);
    } else {
      const line = cart.items.find((i) => i.lineId === id);
      if (!line) throw operationalError('Line not found', 404);
      line.quantity = quantity;
    }
    await cart.save();
    return ok(cart.toJSON());
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;

    const { id } = await params;
    const cart = await Cart.findOne({ user: user._id });
    if (!cart) throw operationalError('Cart not found', 404);

    cart.items = cart.items.filter((i) => i.lineId !== id);
    await cart.save();
    return ok(cart.toJSON());
  } catch (e) {
    return handleError(e);
  }
}
