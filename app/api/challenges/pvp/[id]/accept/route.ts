import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth } from '@/lib/server/permissions';
import { acceptPvpChallenge } from '@/lib/server/services/challenge.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;

    const { id } = await params;
    const challenge = await acceptPvpChallenge(id, user._id);
    return ok(challenge, 'Challenge accepted');
  } catch (e) {
    return handleError(e);
  }
}
