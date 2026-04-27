import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok, notFound, badRequest } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth } from '@/lib/server/permissions';
import { Reward } from '@/lib/db/models/reward';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;

    const body = await req.json();
    const code: string | undefined = body.code;
    const orderTotal: number = Number(body.orderTotal) || 0;

    if (!code) return badRequest('Coupon code required');

    const reward = await Reward.findOne({ code: String(code).toUpperCase(), isActive: true });
    if (!reward) return notFound('Invalid or expired coupon');
    if (reward.expiresAt && reward.expiresAt < new Date()) return badRequest('Coupon expired');
    if (reward.usageLimit && reward.usedCount >= reward.usageLimit) return badRequest('Coupon usage limit reached');
    if (orderTotal < reward.minOrderValue) return badRequest(`Minimum order value is ${reward.minOrderValue}`);

    return ok(reward, 'Coupon valid');
  } catch (e) {
    return handleError(e);
  }
}
