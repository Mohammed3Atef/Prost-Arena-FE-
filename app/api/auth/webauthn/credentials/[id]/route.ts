import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError, operationalError } from '@/lib/server/error';
import { requireAuth } from '@/lib/server/permissions';
import { User } from '@/lib/db/models/user';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

/** DELETE — remove a registered passkey by credentialID (URL-encoded). */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const { id } = await params;
    const credentialID = decodeURIComponent(id);

    const u = await User.findById(user._id);
    if (!u) throw operationalError('User not found', 404);
    const before = u.webauthnCredentials.length;
    u.webauthnCredentials = u.webauthnCredentials.filter((c) => c.credentialID !== credentialID) as never;
    if (u.webauthnCredentials.length === before) throw operationalError('Credential not found', 404);
    await u.save();
    return ok({ removed: credentialID });
  } catch (e) {
    return handleError(e);
  }
}
