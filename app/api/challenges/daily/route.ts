import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth } from '@/lib/server/permissions';
import { getDailyChallenge } from '@/lib/server/services/challenge.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function sanitizeForClient(challenge: any) {
  if (!challenge) return challenge;
  return {
    ...challenge,
    questions: (challenge.questions || [])
      .filter(Boolean)
      .map((q: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { correctIndex, explanation, ...safe } = q;
        return safe;
      }),
  };
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;

    const sp = req.nextUrl.searchParams;
    const category = (sp.get('category') || 'general') as any;
    const challenge = await getDailyChallenge(category, user._id);
    return ok(sanitizeForClient(challenge));
  } catch (e) {
    return handleError(e);
  }
}
