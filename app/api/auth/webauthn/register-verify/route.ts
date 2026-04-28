import '@/lib/models';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { handleError, operationalError } from '@/lib/server/error';
import { requireAuth } from '@/lib/server/permissions';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { rpIdFromRequest, originFromRequest, verifyChallenge, challengeCookieName } from '@/lib/server/webauthn';
import { User } from '@/lib/db/models/user';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;

    const body = await req.json();
    const attestationResponse = body?.attestationResponse;
    const label: string = (body?.label || 'Device').toString();
    if (!attestationResponse) throw operationalError('Missing attestationResponse', 400);

    const cookieToken = req.cookies.get(challengeCookieName('register'))?.value;
    let payload;
    try { payload = verifyChallenge(cookieToken); } catch {
      throw operationalError('Challenge expired — try again', 400);
    }
    if (payload.type !== 'register' || payload.userId !== String(user._id)) {
      throw operationalError('Challenge mismatch', 400);
    }

    const verification = await verifyRegistrationResponse({
      response:                attestationResponse,
      expectedChallenge:       payload.challenge,
      expectedOrigin:          originFromRequest(req),
      expectedRPID:            rpIdFromRequest(req),
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw operationalError('Could not verify the new device', 400);
    }

    const { credential } = verification.registrationInfo;
    const credIdB64u    = credential.id;
    const publicKeyB64u = Buffer.from(credential.publicKey).toString('base64url');
    const counter       = credential.counter ?? 0;

    const u = await User.findById(user._id);
    if (!u) throw operationalError('User not found', 404);

    // Don't double-register the same credential
    if ((u.webauthnCredentials ?? []).some((c) => c.credentialID === credIdB64u)) {
      throw operationalError('This device is already registered', 409);
    }

    u.webauthnCredentials.push({
      credentialID: credIdB64u,
      publicKey:    publicKeyB64u,
      counter,
      transports:   attestationResponse.response?.transports ?? [],
      label:        label.slice(0, 60),
    } as never);
    await u.save();

    const res = NextResponse.json({
      success: true,
      data: { credentialID: credIdB64u, label },
      message: 'Device registered',
    });
    // Clear the challenge cookie now that we're done with it.
    res.cookies.set(challengeCookieName('register'), '', { path: '/', maxAge: 0 });
    return res;
  } catch (e) {
    return handleError(e);
  }
}
