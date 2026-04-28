import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { signInWithGoogle } from '@/lib/server/services/auth.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const idToken: string | undefined     = body?.idToken;
    const accessToken: string | undefined = body?.accessToken;
    await dbConnect();
    const result = await signInWithGoogle({ idToken, accessToken });
    return ok(result, result.isNew ? 'Welcome to Prost Arena' : 'Signed in');
  } catch (e) {
    return handleError(e);
  }
}
