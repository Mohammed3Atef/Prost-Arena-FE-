import '@/lib/models';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { handleError } from '@/lib/server/error';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { RP_ID, signChallenge, challengeCookieName, challengeCookieOptions } from '@/lib/server/webauthn';
import { User } from '@/lib/db/models/user';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Public: anyone can request login challenges. If the client passes a
 * `credentialIdHint` we narrow allowCredentials to that one credential, which
 * lets the browser auto-pick it without a chooser. Without a hint we ask for
 * a discoverable credential (the platform shows the user any matching passkey).
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json().catch(() => ({}));
    const credentialIdHint: string | undefined = body?.credentialIdHint;

    let allowCredentials: { id: string; transports?: AuthenticatorTransport[] }[] | undefined;
    if (credentialIdHint) {
      const u = await User.findOne({ 'webauthnCredentials.credentialID': credentialIdHint }).select('webauthnCredentials');
      const cred = u?.webauthnCredentials.find((c) => c.credentialID === credentialIdHint);
      if (cred) {
        allowCredentials = [{ id: cred.credentialID, transports: cred.transports as AuthenticatorTransport[] }];
      }
    }

    const options = await generateAuthenticationOptions({
      rpID:             RP_ID,
      userVerification: 'preferred',
      allowCredentials,
    });

    const token = signChallenge({ challenge: options.challenge, type: 'login' });
    const res = NextResponse.json({ success: true, data: options });
    res.cookies.set(challengeCookieName('login'), token, challengeCookieOptions());
    return res;
  } catch (e) {
    return handleError(e);
  }
}
