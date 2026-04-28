import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError, operationalError } from '@/lib/server/error';
import { requireAuth } from '@/lib/server/permissions';
import { Cart, lineIdFor } from '@/lib/db/models/cart';
import { MenuItem } from '@/lib/db/models/menuItem';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Add an item or increment its quantity if the same line already exists. */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;

    const body = await req.json();
    const menuItemId: string = body.menuItem;
    const quantity:   number = Math.max(1, Math.floor(Number(body.quantity ?? 1)));
    const addOns:     Array<{ name: string; price: number }> = Array.isArray(body.addOns) ? body.addOns : [];
    const specialNote: string = String(body.specialNote ?? '');

    if (!menuItemId) throw operationalError('menuItem is required', 400);

    // Validate the item exists & is available; recompute price server-side.
    const item = await MenuItem.findById(menuItemId).lean<any>();
    if (!item || !item.isAvailable) throw operationalError('Item is unavailable', 404);
    if (item.isSecret && (user.level ?? 0) < (item.requiredLevel ?? 1)) {
      throw operationalError(`Reach level ${item.requiredLevel} to unlock this item.`, 403);
    }

    const addOnTotal = addOns.reduce((s, a) => s + (Number(a.price) || 0), 0);
    const unitPrice  = (Number(item.price) || 0) + addOnTotal;
    const lineId     = lineIdFor(menuItemId, addOns);

    let cart = await Cart.findOne({ user: user._id });
    if (!cart) cart = await Cart.create({ user: user._id, items: [] });

    const existing = cart.items.find((i) => i.lineId === lineId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.items.push({
        lineId,
        menuItem:    item._id,
        name:        item.name,
        price:       unitPrice,
        quantity,
        addOns,
        specialNote,
        image:       item.image ?? null,
      });
    }
    await cart.save();
    return ok(cart.toJSON());
  } catch (e) {
    return handleError(e);
  }
}
