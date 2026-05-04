import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError, operationalError } from '@/lib/server/error';
import { requireAuth, requireRole } from '@/lib/server/permissions';
import { Challenge } from '@/lib/db/models/challenge';
import { User } from '@/lib/db/models/user';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/challenges/[id]/results
 *
 * Returns the challenge plus a flattened list of every participant attempt,
 * including those across daily-instance copies cloned from this template.
 * Used by the admin's "view results" drawer.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const roleErr = requireRole(user, 'admin', 'superadmin');
    if (roleErr) return roleErr;

    const { id } = await params;

    const template = await Challenge.findById(id).lean<any>();
    if (!template) throw operationalError('Challenge not found', 404);

    // Collect attempts from this template AND from any per-day instance cloned
    // off it. Daily instances carry templateId pointing back here.
    const instances = await Challenge.find({
      $or: [{ _id: template._id }, { templateId: template._id }],
    })
      .select('participants questions date type category timeLimit reward')
      .lean();

    // Flatten participants into one list, joining user info.
    const userIds = new Set<string>();
    const flat: Array<any> = [];
    for (const inst of instances) {
      const totalQ = (inst.questions || []).length;
      for (const p of (inst.participants || [])) {
        if (!p?.user) continue;
        userIds.add(String(p.user));
        flat.push({
          instanceId:  String(inst._id),
          date:        inst.date,
          userId:      String(p.user),
          score:       p.score ?? 0,
          total:       totalQ,
          isFinished:  !!p.isFinished,
          finishedAt:  p.finishedAt ?? null,
          isWin:       totalQ > 0 && (p.score ?? 0) === totalQ,
        });
      }
    }

    const users = await User.find({ _id: { $in: Array.from(userIds) } })
      .select('name email level')
      .lean<any[]>();
    const userMap = Object.fromEntries(users.map((u: any) => [String(u._id), u]));

    const participants = flat.map((p) => ({
      ...p,
      user: userMap[p.userId] || null,
    }));

    // Sort: most recent attempts first.
    participants.sort((a, b) => {
      const ta = a.finishedAt ? new Date(a.finishedAt).getTime() : 0;
      const tb = b.finishedAt ? new Date(b.finishedAt).getTime() : 0;
      return tb - ta;
    });

    const totalAttempts = participants.length;
    const totalWins = participants.filter((p) => p.isWin).length;

    return ok({
      challenge: {
        _id:       String(template._id),
        type:      template.type,
        category:  template.category,
        timeLimit: template.timeLimit,
        reward:    template.reward,
        questionCount: (template.questions || []).length,
      },
      stats: {
        totalAttempts,
        totalWins,
        winRate: totalAttempts > 0 ? Math.round((totalWins / totalAttempts) * 100) : 0,
        uniquePlayers: userIds.size,
      },
      participants,
    });
  } catch (e) {
    return handleError(e);
  }
}
