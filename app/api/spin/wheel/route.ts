import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth, requireRole } from '@/lib/server/permissions';
import { SpinWheelConfig } from '@/lib/db/models/spinWheel';
import { getActiveWheel } from '@/lib/server/services/spinWheel.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    await dbConnect();
    const wheel = await getActiveWheel();
    return ok(wheel);
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const roleErr = requireRole(user, 'admin', 'superadmin');
    if (roleErr) return roleErr;

    const body = await req.json();
    const wheel = await SpinWheelConfig.findOneAndUpdate(
      {},
      body,
      { new: true, upsert: true, runValidators: true },
    );
    return ok(wheel, 'Wheel updated');
  } catch (e) {
    return handleError(e);
  }
}
