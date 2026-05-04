import '@/lib/models';
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/mongoose';
import { ok } from '@/lib/server/response';
import { handleError } from '@/lib/server/error';
import { requireAuth, requireRole } from '@/lib/server/permissions';
import { User } from '@/lib/db/models/user';
import { Order } from '@/lib/db/models/order';
import { SpinLog } from '@/lib/db/models/spinWheel';
import { Challenge } from '@/lib/db/models/challenge';
import { Reward } from '@/lib/db/models/reward';
import { UserReward } from '@/lib/db/models/userReward';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'on-the-way', 'delivered', 'cancelled'] as const;

// Bucket all order timestamps by Egypt local-day instead of UTC, so the
// dashboard's "today" lines up with what admins see in the orders table.
// Without this, an order placed late evening Cairo time keys to the next UTC
// day and falls into tomorrow's bucket (or off the chart entirely).
const TZ = 'Africa/Cairo';
const KEY_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
});
const LABEL_FMT = new Intl.DateTimeFormat('en', {
  timeZone: TZ, month: 'short', day: 'numeric',
});

/** YYYY-MM-DD key for a date, evaluated in the business timezone. */
function tzKey(d: Date): string {
  return KEY_FMT.format(d);
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { user, error } = await requireAuth(req);
    if (error) return error;
    const roleErr = requireRole(user, 'admin', 'superadmin');
    if (roleErr) return roleErr;

    const days = Math.max(1, Math.min(365, Number(req.nextUrl.searchParams.get('days')) || 7));
    const now = new Date();
    // Pre-filter: scan orders from (days+1) days ago in UTC to be sure we cover
    // any order whose Cairo-local day falls in the window. Bucketing below uses
    // Cairo-TZ keys so the "today" boundary lines up with what admins see.
    const since = new Date(now.getTime() - (days + 1) * 86400000);
    const todayKey = tzKey(now);

    const [
      totalUsers,
      totalOrders,
      todayOrders,
      revenueAgg,
      chartAgg,
      newUsersAgg,
      recentOrders,
      ordersByStatusAgg,
      topItemsAgg,
      topSpendersAgg,
      topSpinnersAgg,
      challengeAgg,
      couponAgg,
      activeRewardsCount,
      totalUserRewards,
    ] = await Promise.all([
      User.countDocuments({ isBanned: false }),
      Order.countDocuments(),
      // Orders whose Cairo-local day == today's Cairo day.
      Order.aggregate([
        { $match: { createdAt: { $gte: new Date(now.getTime() - 2 * 86400000) } } },
        { $project: {
            day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } },
          } },
        { $match: { day: todayKey } },
        { $count: 'count' },
      ]),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]),
      Order.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } },
            orders: { $sum: 1 },
            revenue: { $sum: '$total' },
          } },
        { $sort: { _id: 1 } },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } },
            users: { $sum: 1 },
          } },
        { $sort: { _id: 1 } },
      ]),
      Order.find().sort({ createdAt: -1 }).limit(8).populate('user', 'name email').lean(),
      // Orders by status (overall, not just window — gives admin a snapshot)
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Top 10 items by quantity ordered (lifetime)
      Order.aggregate([
        { $unwind: '$items' },
        { $group: {
            _id: '$items.menuItem',
            name: { $first: '$items.name' },
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.subtotal' },
          } },
        { $sort: { quantity: -1 } },
        { $limit: 10 },
      ]),
      // Top 5 spenders by lifetime order total
      Order.aggregate([
        { $match: { user: { $ne: null } } },
        { $group: {
            _id: '$user',
            spent: { $sum: '$total' },
            orders: { $sum: 1 },
          } },
        { $sort: { spent: -1 } },
        { $limit: 5 },
        { $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          } },
        { $unwind: '$user' },
        { $project: {
            _id: 1,
            spent: 1,
            orders: 1,
            name: '$user.name',
            email: '$user.email',
            level: '$user.level',
          } },
      ]),
      // Top 5 spinners by SpinLog count
      SpinLog.aggregate([
        { $group: {
            _id: '$user',
            spins: { $sum: 1 },
            xpEarned: { $sum: '$xpAwarded' },
            pointsEarned: { $sum: '$pointsAwarded' },
          } },
        { $sort: { spins: -1 } },
        { $limit: 5 },
        { $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          } },
        { $unwind: '$user' },
        { $project: {
            _id: 1,
            spins: 1,
            xpEarned: 1,
            pointsEarned: 1,
            name: '$user.name',
            email: '$user.email',
            level: '$user.level',
          } },
      ]),
      // Challenge attempts + wins, by category
      Challenge.aggregate([
        { $match: { type: 'daily', participants: { $exists: true, $ne: [] } } },
        { $unwind: '$participants' },
        { $project: {
            category: 1,
            score: '$participants.score',
            total: { $size: { $ifNull: ['$questions', []] } },
          } },
        { $group: {
            _id: '$category',
            attempts: { $sum: 1 },
            wins: { $sum: { $cond: [{ $and: [{ $gt: ['$total', 0] }, { $eq: ['$score', '$total'] }] }, 1, 0] } },
          } },
      ]),
      // Top coupon codes by redemption count (uses Reward.usedCount)
      Reward.aggregate([
        { $match: { code: { $ne: null } } },
        { $project: { code: 1, name: 1, type: 1, usedCount: 1, usageLimit: 1 } },
        { $sort: { usedCount: -1 } },
        { $limit: 10 },
      ]),
      Reward.countDocuments({ isActive: true }),
      UserReward.countDocuments(),
    ]);

    // Build the daily chart, filling zeros for missing days. Both bucket keys
    // and chart axis labels are evaluated in the Cairo timezone so they match
    // the keys produced by Mongo's $dateToString above. Iterate from
    // (days-1) ago up to today, adding 24h each step.
    const chartMap = Object.fromEntries(chartAgg.map((d: any) => [d._id, d]));
    const usersMap = Object.fromEntries(newUsersAgg.map((d: any) => [d._id, d]));
    const ordersChart: Array<{ date: string; orders: number; revenue: number; newUsers: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = tzKey(d);
      ordersChart.push({
        date: LABEL_FMT.format(d),
        orders: chartMap[key]?.orders ?? 0,
        revenue: Math.round((chartMap[key]?.revenue ?? 0) * 100) / 100,
        newUsers: usersMap[key]?.users ?? 0,
      });
    }

    // Order-status breakdown — fill any missing statuses with 0 so the chart axis is stable.
    const statusMap = Object.fromEntries(ordersByStatusAgg.map((d: any) => [d._id, d.count]));
    const ordersByStatus = ORDER_STATUSES.map((s) => ({ status: s, count: statusMap[s] ?? 0 }));

    // Challenge stats — totals + per-category breakdown.
    const totalChallengeAttempts = challengeAgg.reduce((s: number, c: any) => s + c.attempts, 0);
    const totalChallengeWins = challengeAgg.reduce((s: number, c: any) => s + c.wins, 0);
    const challengeByCategory = challengeAgg.map((c: any) => ({
      category: c._id,
      attempts: c.attempts,
      wins: c.wins,
      winRate: c.attempts > 0 ? Math.round((c.wins / c.attempts) * 100) : 0,
    }));

    // Coupon stats — total issued is the count of UserReward records ever created;
    // total redeemed is UserRewards with status='used'. Codes table uses Reward.usedCount.
    const redeemedCount = await UserReward.countDocuments({ status: 'used' });

    return ok({
      // Headline stats (preserved for backwards compat with dashboard)
      totalUsers,
      totalOrders,
      activeToday: (todayOrders as any[])[0]?.count ?? 0,
      revenue: Math.round((revenueAgg[0]?.total ?? 0) * 100) / 100,
      ordersChart,
      recentOrders,

      // New breakdowns
      windowDays: days,
      ordersByStatus,
      topItems: topItemsAgg.map((i: any) => ({
        menuItem: i._id,
        name: i.name,
        quantity: i.quantity,
        revenue: Math.round((i.revenue ?? 0) * 100) / 100,
      })),
      topSpenders: topSpendersAgg.map((s: any) => ({
        userId: s._id,
        name: s.name,
        email: s.email,
        level: s.level,
        spent: Math.round((s.spent ?? 0) * 100) / 100,
        orders: s.orders,
      })),
      topSpinners: topSpinnersAgg.map((s: any) => ({
        userId: s._id,
        name: s.name,
        email: s.email,
        level: s.level,
        spins: s.spins,
        xpEarned: s.xpEarned,
        pointsEarned: s.pointsEarned,
      })),
      challengeStats: {
        totalAttempts: totalChallengeAttempts,
        totalWins: totalChallengeWins,
        winRate: totalChallengeAttempts > 0 ? Math.round((totalChallengeWins / totalChallengeAttempts) * 100) : 0,
        byCategory: challengeByCategory,
      },
      couponStats: {
        activeCoupons: activeRewardsCount,
        totalIssued: totalUserRewards,
        totalRedeemed: redeemedCount,
        redeemRate: totalUserRewards > 0 ? Math.round((redeemedCount / totalUserRewards) * 100) : 0,
        topCodes: couponAgg.map((c: any) => ({
          code: c.code,
          name: c.name,
          type: c.type,
          usedCount: c.usedCount ?? 0,
          usageLimit: c.usageLimit,
        })),
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
