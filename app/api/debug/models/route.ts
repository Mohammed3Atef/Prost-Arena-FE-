import '@/lib/models';
import type { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db/mongoose';
import { ok, forbidden } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { getUserFromRequest } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Diagnostic: list every Mongoose model registered on the current connection,
 * plus the refs each schema declares. Useful when chasing MissingSchemaError
 * on Vercel.
 *
 * Access:
 *   - In non-production: open to anyone.
 *   - In production: admin or superadmin only (so we don't leak schema names
 *     to anonymous users on a live deployment).
 */
export async function GET(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      const user = await getUserFromRequest(req);
      if (!user || !['admin', 'superadmin'].includes(user.role)) {
        return forbidden('Admin only in production');
      }
    }

    await dbConnect();

    const names = mongoose.modelNames().sort();
    const refs: Record<string, string[]> = {};

    for (const name of names) {
      const m = mongoose.model(name);
      const collected = new Set<string>();
      m.schema.eachPath((_path, schemaType: any) => {
        const direct = schemaType?.options?.ref;
        if (typeof direct === 'string') collected.add(direct);
        // Array of ObjectId-with-ref: option lives in caster.options
        const casterRef = schemaType?.caster?.options?.ref;
        if (typeof casterRef === 'string') collected.add(casterRef);
      });
      refs[name] = Array.from(collected).sort();
    }

    return ok({
      modelCount: names.length,
      models: names,
      refs,
      connectionState: mongoose.connection.readyState,
    });
  } catch (e) {
    return handleError(e);
  }
}
