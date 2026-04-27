import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { parseBody } from '@/lib/server/validate';
import { handleError } from '@/lib/server/error';
import { otpVerifySchema } from '@/lib/validation/auth.schema';
import { verifyOtpAndAuth } from '@/lib/server/services/auth.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const data = await parseBody(req, otpVerifySchema);
    await dbConnect();
    const result = await verifyOtpAndAuth(data);
    return ok(result, result.isNew ? 'Account created' : 'Logged in');
  } catch (e) {
    return handleError(e);
  }
}
