import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { parseBody } from '@/lib/server/validate';
import { handleError } from '@/lib/server/error';
import { registerSchema } from '@/lib/validation/auth.schema';
import { register } from '@/lib/server/services/auth.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const data = await parseBody(req, registerSchema);
    await dbConnect();
    const result = await register(data);
    return ok(result, 'Registered');
  } catch (e) {
    return handleError(e);
  }
}
