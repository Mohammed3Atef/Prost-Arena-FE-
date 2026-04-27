import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { parseBody } from '@/lib/server/validate';
import { handleError } from '@/lib/server/error';
import { guestCheckoutSchema } from '@/lib/validation/auth.schema';
import { guestCheckout } from '@/lib/server/services/auth.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const data = await parseBody(req, guestCheckoutSchema);
    await dbConnect();
    const result = await guestCheckout(data);
    return ok(result, 'Guest session created');
  } catch (e) {
    return handleError(e);
  }
}
