import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth, requireRole } from '@/lib/server/permissions';
import { User } from '@/lib/db/models/user';
import { Order } from '@/lib/db/models/order';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const roleErr = requireRole(user, 'admin', 'superadmin');
    if (roleErr) return roleErr;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const ago7 = new Date(today);
    ago7.setDate(ago7.getDate() - 6);

    const [totalUsers, totalOrders, todayOrders, revenueAgg, chartAgg, newUsersAgg, recentOrders] = await Promise.all([
      User.countDocuments({ isBanned: false }),
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: today } }),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]),
      Order.aggregate([
        { $match: { createdAt: { $gte: ago7 } } },
        { $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            orders: { $sum: 1 },
            revenue: { $sum: '$total' },
          } },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: ago7 } } },
        { $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            users: { $sum: 1 },
          } },
        { $sort: { _id: 1 } },
      ]),
      Order.find().sort({ createdAt: -1 }).limit(8).populate('user', 'name email').lean(),
    ]);

    const chartMap = Object.fromEntries(chartAgg.map((d: any) => [d._id, d]));
    const usersMap = Object.fromEntries(newUsersAgg.map((d: any) => [d._id, d]));
    const ordersChart = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(ago7);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      ordersChart.push({
        date: d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }),
        orders: chartMap[key]?.orders ?? 0,
        revenue: chartMap[key]?.revenue ?? 0,
        newUsers: usersMap[key]?.users ?? 0,
      });
    }

    return ok({
      totalUsers,
      totalOrders,
      activeToday: todayOrders,
      revenue: Math.round((revenueAgg[0]?.total ?? 0) * 100) / 100,
      ordersChart,
      recentOrders,
    });
  } catch (e) {
    return handleError(e);
  }
}
