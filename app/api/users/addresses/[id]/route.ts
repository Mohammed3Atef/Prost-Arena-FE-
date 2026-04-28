import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError, operationalError } from '@/lib/server/error';
import { requireAuth } from '@/lib/server/permissions';
import { User } from '@/lib/db/models/user';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

const PICK = ['label', 'street', 'building', 'apt', 'city', 'zip', 'notes', 'coords', 'isDefault'] as const;

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const { id } = await params;

    const body = await req.json();
    const u = await User.findById(user._id);
    if (!u) throw operationalError('User not found', 404);
    if (!u.addresses) u.addresses = [] as any;

    const addr = u.addresses.find((a) => String(a._id) === id);
    if (!addr) throw operationalError('Address not found', 404);

    for (const k of PICK) if (k in body) (addr as any)[k] = body[k];

    if (body.isDefault === true) {
      u.addresses.forEach((a) => { a.isDefault = String(a._id) === id; });
    }
    await u.save();
    return ok(JSON.parse(JSON.stringify(u.addresses)));
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

    const u = await User.findById(user._id);
    if (!u) throw operationalError('User not found', 404);
    if (!u.addresses) u.addresses = [] as any;
    const wasDefault = u.addresses.find((a) => String(a._id) === id)?.isDefault;
    u.addresses = u.addresses.filter((a) => String(a._id) !== id) as any;
    // Promote a new default if we deleted the previous default
    if (wasDefault && u.addresses.length > 0) u.addresses[0].isDefault = true;
    await u.save();
    return ok(JSON.parse(JSON.stringify(u.addresses)));
  } catch (e) {
    return handleError(e);
  }
}
