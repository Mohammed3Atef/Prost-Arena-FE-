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

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const { id } = await params;

    const u = await User.findById(user._id);
    if (!u) throw operationalError('User not found', 404);
    if (!u.addresses) u.addresses = [] as any;
    const target = u.addresses.find((a) => String(a._id) === id);
    if (!target) throw operationalError('Address not found', 404);
    u.addresses.forEach((a) => { a.isDefault = String(a._id) === id; });
    await u.save();
    return ok(JSON.parse(JSON.stringify(u.addresses)));
  } catch (e) {
    return handleError(e);
  }
}
