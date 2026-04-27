import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { User } from '@/lib/db/models/user';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FIELD_BY_TYPE: Record<string, 'xp' | 'ordersCount' | 'challengeWins'> = {
  xp: 'xp',
  orders: 'ordersCount',
  wins: 'challengeWins',
};

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const sp = req.nextUrl.searchParams;
    const type = sp.get('type') || 'xp';
    const limit = Math.min(parseInt(sp.get('limit') || '50', 10), 100);

    const sortField = FIELD_BY_TYPE[type] || 'xp';
    const users = await User.find({ isActive: true, isBanned: false })
      .sort({ [sortField]: -1 })
      .limit(limit)
      .select('name avatar level xp ordersCount challengeWins')
      .lean();

    const ranked = users.map((u: any, i) => ({
      rank: i + 1,
      score: u[sortField] ?? 0,
      ...u,
    }));

    return ok(ranked);
  } catch (e) {
    return handleError(e);
  }
}
