import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok, created } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth, requireRole } from '@/lib/server/permissions';
import { MenuCategory } from '@/lib/db/models/menuCategory';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    await dbConnect();
    const categories = await MenuCategory.find({ isActive: true }).sort('sortOrder').lean();
    return ok(categories);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const roleErr = requireRole(user, 'admin', 'superadmin');
    if (roleErr) return roleErr;

    const body = await req.json();
    const slug = String(body.name).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const cat = await MenuCategory.create({
      name: body.name,
      slug,
      icon: body.icon,
      description: body.description,
      sortOrder: body.sortOrder,
    });
    return created(cat);
  } catch (e) {
    return handleError(e);
  }
}
