import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok, notFound } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth, requireRole, optionalAuth } from '@/lib/server/permissions';
import { MenuItem } from '@/lib/db/models/menuItem';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    await optionalAuth(req);
    const { id } = await params;
    const item = await MenuItem.findById(id).populate('category').lean();
    if (!item) return notFound();
    return ok(item);
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const roleErr = requireRole(user, 'admin', 'superadmin');
    if (roleErr) return roleErr;

    const { id } = await params;
    const body = await req.json();
    const item = await MenuItem.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!item) return notFound();
    return ok(item);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const roleErr = requireRole(user, 'admin', 'superadmin');
    if (roleErr) return roleErr;

    const { id } = await params;
    const item = await MenuItem.findById(id);
    if (!item) return notFound();
    await item.softDelete();
    return ok(null, 'Item deleted');
  } catch (e) {
    return handleError(e);
  }
}
