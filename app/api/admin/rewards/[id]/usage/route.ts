import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError, operationalError } from '@/lib/server/error';
import { requireAuth, requireRole } from '@/lib/server/permissions';
import { Reward } from '@/lib/db/models/reward';
import { UserReward } from '@/lib/db/models/userReward';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/rewards/[id]/usage
 *
 * Returns every UserReward issued from this Reward, joined with the user
 * (name/email) and (when used) the order it was applied to (orderNumber,
 * total, createdAt). Sorted newest first.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const roleErr = requireRole(user, 'admin', 'superadmin');
    if (roleErr) return roleErr;

    const { id } = await params;
    const reward = await Reward.findById(id).lean<any>();
    if (!reward) throw operationalError('Reward not found', 404);

    const userRewards = await UserReward.find({ reward: id })
      .sort({ createdAt: -1 })
      .populate('user', 'name email level')
      .populate('usedOnOrder', 'orderNumber total createdAt status')
      .lean();

    const counts = {
      total:    userRewards.length,
      active:   userRewards.filter((u: any) => u.status === 'active').length,
      used:     userRewards.filter((u: any) => u.status === 'used').length,
      expired:  userRewards.filter((u: any) => u.status === 'expired').length,
    };

    return ok({
      reward: {
        _id:           String(reward._id),
        name:          reward.name,
        code:          reward.code,
        type:          reward.type,
        discountPct:   reward.discountPct,
        discountFixed: reward.discountFixed,
        usedCount:     reward.usedCount,
        usageLimit:    reward.usageLimit,
        isActive:      reward.isActive,
      },
      counts,
      items: userRewards.map((u: any) => ({
        _id:        String(u._id),
        user:       u.user ? { _id: String(u.user._id), name: u.user.name, email: u.user.email, level: u.user.level } : null,
        status:     u.status,
        source:     u.source,
        createdAt:  u.createdAt,
        usedAt:     u.usedAt,
        expiresAt:  u.expiresAt,
        usedOnOrder: u.usedOnOrder ? {
          _id:         String(u.usedOnOrder._id),
          orderNumber: u.usedOnOrder.orderNumber,
          total:       u.usedOnOrder.total,
          status:      u.usedOnOrder.status,
          createdAt:   u.usedOnOrder.createdAt,
        } : null,
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}
