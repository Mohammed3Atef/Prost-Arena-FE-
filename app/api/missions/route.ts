import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok, created } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth, requireRole } from '@/lib/server/permissions';
import { Mission, UserMission } from '@/lib/db/models/mission';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;

    const missions = await Mission.find({ isActive: true }).sort('sortOrder').lean();
    const userMissions = await UserMission.find({
      user: user._id,
      mission: { $in: missions.map((m: any) => m._id) },
    }).lean();

    const progressMap = Object.fromEntries(
      userMissions.map((um: any) => [um.mission.toString(), um]),
    );

    const result = missions.map((m: any) => ({
      ...m,
      userProgress: progressMap[m._id.toString()] || { progress: 0, status: 'active' },
    }));

    return ok(result);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const roleErr = requireRole(user, 'admin', 'superadmin');
    if (roleErr) return roleErr;

    const body = await req.json();
    const mission = await Mission.create(body);
    return created(mission);
  } catch (e) {
    return handleError(e);
  }
}
