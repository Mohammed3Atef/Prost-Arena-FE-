import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { parseBody } from '@/lib/server/validate';
import { handleError } from '@/lib/server/error';
import { otpSendSchema } from '@/lib/validation/auth.schema';
import { sendOtp } from '@/lib/server/services/auth.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const data = await parseBody(req, otpSendSchema);
    await dbConnect();
    const result = await sendOtp(data.phone);
    return ok(result, 'OTP sent');
  } catch (e) {
    return handleError(e);
  }
}
