import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok, notFound } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth, requireRole } from '@/lib/server/permissions';
import { Mission } from '@/lib/db/models/mission';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const roleErr = requireRole(user, 'admin', 'superadmin');
    if (roleErr) return roleErr;

    const { id } = await params;
    const body = await req.json();
    const mission = await Mission.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!mission) return notFound();
    return ok(mission);
  } catch (e) {
    return handleError(e);
  }
}
