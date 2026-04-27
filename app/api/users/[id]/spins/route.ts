import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok, notFound, badRequest } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth, requireRole } from '@/lib/server/permissions';
import { User } from '@/lib/db/models/user';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const roleErr = requireRole(user, 'admin', 'superadmin');
    if (roleErr) return roleErr;

    const { id } = await params;
    const body = await req.json();
    if (typeof body.amount !== 'number') return badRequest('amount must be a number');

    const updated = await User.findByIdAndUpdate(
      id,
      { $inc: { bonusSpins: body.amount } },
      { new: true },
    ).lean<any>();
    if (!updated) return notFound();
    return ok({ bonusSpins: updated.bonusSpins }, `Bonus spins updated: ${updated.bonusSpins} total`);
  } catch (e) {
    return handleError(e);
  }
}
