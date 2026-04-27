import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok, badRequest } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth } from '@/lib/server/permissions';
import { submitPvpAnswer } from '@/lib/server/services/challenge.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;

    const { id } = await params;
    const body = await req.json();
    const questionIndex = Number(body.questionIndex);
    const answeredIndex = Number(body.answeredIndex);

    if (!Number.isFinite(questionIndex) || !Number.isFinite(answeredIndex)) {
      return badRequest('questionIndex and answeredIndex are required numbers');
    }

    const result = await submitPvpAnswer(id, user._id, questionIndex, answeredIndex);
    return ok(result);
  } catch (e) {
    return handleError(e);
  }
}
