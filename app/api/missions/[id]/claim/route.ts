import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok, notFound, badRequest } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth } from '@/lib/server/permissions';
import { Mission, UserMission } from '@/lib/db/models/mission';
import { User } from '@/lib/db/models/user';
import { UserReward } from '@/lib/db/models/userReward';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;

    const { id } = await params;
    const mission = await Mission.findById(id);
    if (!mission) return notFound();

    const userMission = await UserMission.findOne({
      user: user._id,
      mission: id,
      status: 'completed',
    });
    if (!userMission) return badRequest('Mission not completed or already claimed');

    userMission.status = 'claimed';
    userMission.claimedAt = new Date();
    await userMission.save();

    const u = await User.findById(user._id);
    if (u) {
      if (mission.reward.xp) u.addXp(mission.reward.xp);
      if (mission.reward.points) u.points += mission.reward.points;
      await u.save();
    }

    let userReward: any = null;
    if (mission.reward.rewardId) {
      userReward = await UserReward.create({
        user: user._id,
        reward: mission.reward.rewardId,
        source: 'mission',
      });
    }

    return ok({
      xpAwarded: mission.reward.xp,
      pointsAwarded: mission.reward.points,
      userReward,
    }, 'Reward claimed!');
  } catch (e) {
    return handleError(e);
  }
}
