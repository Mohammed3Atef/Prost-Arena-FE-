import { ok } from '@/lib/server/response';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return ok({ status: 'ok', timestamp: new Date().toISOString() });
}
