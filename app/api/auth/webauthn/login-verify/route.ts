import '@/lib/models';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { handleError, operationalError } from '@/lib/server/error';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { rpIdFromRequest, originFromRequest, verifyChallenge, challengeCookieName } from '@/lib/server/webauthn';
import { User } from '@/lib/db/models/user';
import { issueTokens } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function sanitize(u: any) {
  const obj = u.toObject ? u.toObject() : { ...u };
  delete obj.password;
  delete obj.guestToken;
  delete obj.emailVerifyToken;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const assertionResponse = body?.assertionResponse;
    if (!assertionResponse?.id) throw operationalError('Missing assertion', 400);

    const cookieToken = req.cookies.get(challengeCookieName('login'))?.value;
    let payload;
    try { payload = verifyChallenge(cookieToken); } catch {
      throw operationalError('Challenge expired — try again', 400);
    }
    if (payload.type !== 'login') throw operationalError('Challenge mismatch', 400);

    // The credential ID returned by the browser is base64url-encoded.
    const credentialID: string = assertionResponse.id;
    const u = await User.findOne({ 'webauthnCredentials.credentialID': credentialID });
    if (!u) throw operationalError('No matching credential', 401);
    const cred = u.webauthnCredentials.find((c) => c.credentialID === credentialID);
    if (!cred) throw operationalError('Credential not found on user', 401);

    const verification = await verifyAuthenticationResponse({
      response: assertionResponse,
      expectedChallenge: payload.challenge,
      expectedOrigin:    originFromRequest(req),
      expectedRPID:      rpIdFromRequest(req),
      credential: {
        id:        cred.credentialID,
        publicKey: new Uint8Array(Buffer.from(cred.publicKey, 'base64url')),
        counter:   cred.counter,
        transports: cred.transports as AuthenticatorTransport[],
      },
      requireUserVerification: false,
    });

    if (!verification.verified) throw operationalError('Biometric verification failed', 401);

    // Increment the counter to defend against cloned authenticators.
    cred.counter = verification.authenticationInfo.newCounter;
    if (u.isBanned) throw operationalError('Account is suspended', 403);
    u.lastLoginAt = new Date();
    await u.save();

    const tokens = issueTokens(u);
    const res = NextResponse.json({
      success: true,
      data: { user: sanitize(u), ...tokens },
      message: 'Signed in',
    });
    res.cookies.set(challengeCookieName('login'), '', { path: '/', maxAge: 0 });
    return res;
  } catch (e) {
    return handleError(e);
  }
}
