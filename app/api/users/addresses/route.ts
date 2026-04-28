import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok, created } from '@/lib/server/response';
import { handleError, operationalError } from '@/lib/server/error';
import { requireAuth } from '@/lib/server/permissions';
import { User } from '@/lib/db/models/user';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PICK = ['label', 'street', 'building', 'apt', 'city', 'zip', 'notes', 'coords', 'isDefault'] as const;

function pick(body: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of PICK) if (k in body) out[k] = body[k];
  return out;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const u = await User.findById(user._id).select('addresses').lean<any>();
    const addresses = (u?.addresses ?? []).map((a: any) => ({
      ...a,
      _id: String(a._id),
    }));
    return ok(addresses);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;

    const body = await req.json();
    const data = pick(body);
    if (!data.street || !data.city) {
      throw operationalError('street and city are required', 400);
    }
    const u = await User.findById(user._id);
    if (!u) throw operationalError('User not found', 404);
    // Legacy user docs created before the addresses field was added may have it undefined.
    if (!u.addresses) u.addresses = [] as any;

    // First address auto-becomes default
    const willBeDefault = u.addresses.length === 0 ? true : !!data.isDefault;
    if (willBeDefault) u.addresses.forEach((a) => { a.isDefault = false; });
    u.addresses.push({ ...(data as any), isDefault: willBeDefault });
    await u.save();
    return created(JSON.parse(JSON.stringify(u.addresses)));
  } catch (e) {
    return handleError(e);
  }
}
