import '@/lib/models';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { handleError } from '@/lib/server/error';
import { requireAuth } from '@/lib/server/permissions';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { RP_ID, RP_NAME, signChallenge, challengeCookieName, challengeCookieOptions } from '@/lib/server/webauthn';
import { User } from '@/lib/db/models/user';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;

    const u = await User.findById(user._id).select('webauthnCredentials');
    const existing = (u?.webauthnCredentials ?? []).map((c) => ({
      id:         c.credentialID,
      transports: (c.transports as AuthenticatorTransport[] | undefined) ?? [],
    }));

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID:   RP_ID,
      userID: new TextEncoder().encode(String(user._id)),
      userName: user.email || user.name || `user-${user._id}`,
      userDisplayName: user.name || user.email || 'Prost Arena user',
      authenticatorSelection: {
        residentKey:      'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform', // Prefer device biometric (Face ID, fingerprint, Windows Hello)
      },
      excludeCredentials: existing,
      attestationType: 'none',
    });

    const token = signChallenge({ challenge: options.challenge, userId: String(user._id), type: 'register' });

    const res = NextResponse.json({ success: true, data: options });
    res.cookies.set(challengeCookieName('register'), token, challengeCookieOptions());
    return res;
  } catch (e) {
    return handleError(e);
  }
}
