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

const VALID_ROLES = ['user', 'admin', 'superadmin'];

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const roleErr = requireRole(user, 'superadmin');
    if (roleErr) return roleErr;

    const { id } = await params;
    const body = await req.json();
    if (!VALID_ROLES.includes(body.role)) return badRequest('Invalid role');

    const updated = await User.findByIdAndUpdate(id, { role: body.role }, { new: true }).lean();
    if (!updated) return notFound();
    return ok(updated, `Role updated to ${body.role}`);
  } catch (e) {
    return handleError(e);
  }
}
