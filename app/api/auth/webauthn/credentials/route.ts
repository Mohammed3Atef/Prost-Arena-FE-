import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth } from '@/lib/server/permissions';
import { User } from '@/lib/db/models/user';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** GET — list current user's registered credentials (without exposing the public key bytes). */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const u = await User.findById(user._id).select('webauthnCredentials').lean<any>();
    const list = (u?.webauthnCredentials ?? []).map((c: any) => ({
      credentialID: c.credentialID,
      label:        c.label,
      transports:   c.transports,
      createdAt:    c.createdAt,
    }));
    return ok(list);
  } catch (e) {
    return handleError(e);
  }
}
