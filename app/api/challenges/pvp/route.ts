import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { created } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth } from '@/lib/server/permissions';
import { createPvpChallenge } from '@/lib/server/services/challenge.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const challenge = await createPvpChallenge(user._id, body.category || 'general');
    return created(challenge, 'Challenge created — share the ID with your opponent');
  } catch (e) {
    return handleError(e);
  }
}
