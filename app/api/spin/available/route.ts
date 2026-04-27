import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth } from '@/lib/server/permissions';
import { checkAvailability } from '@/lib/server/services/spinWheel.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;

    const result = await checkAvailability(user._id);
    return ok(result);
  } catch (e) {
    return handleError(e);
  }
}
