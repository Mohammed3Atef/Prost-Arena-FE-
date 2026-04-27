import { ok } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  try {
    return ok(null, 'Logged out');
  } catch (e) {
    return handleError(e);
  }
}
