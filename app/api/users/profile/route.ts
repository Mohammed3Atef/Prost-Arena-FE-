import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok, notFound } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth } from '@/lib/server/permissions';
import { User } from '@/lib/db/models/user';
import { xpProgressInLevel } from '@/lib/server/gamification';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_UPDATES = ['name', 'avatar', 'phone'] as const;

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;

    const fresh = await User.findById(user._id).lean<any>();
    if (!fresh) return notFound();
    return ok({ ...fresh, xpProgress: xpProgressInLevel(fresh.xp || 0) });
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;

    const body = await req.json();
    const updates: Record<string, unknown> = {};
    for (const field of ALLOWED_UPDATES) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    const updated = await User.findByIdAndUpdate(user._id, updates, {
      new: true,
      runValidators: true,
    }).lean();

    return ok(updated, 'Profile updated');
  } catch (e) {
    return handleError(e);
  }
}
