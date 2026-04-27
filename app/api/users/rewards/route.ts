import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth } from '@/lib/server/permissions';
import { UserReward } from '@/lib/db/models/userReward';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;

    const rewards = await UserReward.find({ user: user._id, status: 'active' })
      .populate('reward')
      .sort({ createdAt: -1 })
      .lean();
    return ok(rewards);
  } catch (e) {
    return handleError(e);
  }
}
