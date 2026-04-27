import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth, requireRole } from '@/lib/server/permissions';
import { getConfig } from '@/lib/db/models/challengeConfig';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_UPDATES = ['isEnabled', 'maxAttemptsPerDay', 'enabledCategories'] as const;

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const cfg = await getConfig();
    return ok(cfg);
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
    const updates: Record<string, unknown> = {};
    for (const f of ALLOWED_UPDATES) {
      if (body[f] !== undefined) updates[f] = body[f];
    }
    updates.updatedBy = user._id;

    const cfg = await getConfig();
    Object.assign(cfg, updates);
    await cfg.save();
    return ok(cfg, 'Challenge settings saved');
  } catch (e) {
    return handleError(e);
  }
}
