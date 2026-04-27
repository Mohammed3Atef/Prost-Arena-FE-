import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth } from '@/lib/server/permissions';
import { submitDailyAnswers } from '@/lib/server/services/challenge.service';

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
    const result = await submitDailyAnswers(id, user._id, body.answers || []);
    return ok(result, 'Answers submitted');
  } catch (e) {
    return handleError(e);
  }
}
