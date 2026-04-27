import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok, notFound } from '@/lib/server/response';
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
    const isBanned: boolean = !!body.isBanned;
    const banReason: string | null = isBanned ? (body.banReason || null) : null;

    const updated = await User.findByIdAndUpdate(
      id,
      { isBanned, banReason },
      { new: true },
    ).lean();
    if (!updated) return notFound();
    return ok(updated, isBanned ? 'User banned' : 'User unbanned');
  } catch (e) {
    return handleError(e);
  }
}
