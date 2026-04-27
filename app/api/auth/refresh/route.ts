import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { parseBody } from '@/lib/server/validate';
import { handleError } from '@/lib/server/error';
import { refreshTokenSchema } from '@/lib/validation/auth.schema';
import { refreshTokens } from '@/lib/server/services/auth.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const data = await parseBody(req, refreshTokenSchema);
    await dbConnect();
    const tokens = await refreshTokens(data.refreshToken);
    return ok(tokens, 'Token refreshed');
  } catch (e) {
    return handleError(e);
  }
}
