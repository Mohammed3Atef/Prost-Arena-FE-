'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingUp, ShoppingBag, Users, DollarSign, Trophy, Ticket } from 'lucide-react';
import api from '../../../services/api/client';
import { cn, formatCurrency, formatNumber } from '../../../lib/utils';

interface ChartPoint { date: string; orders: number; revenue: number; newUsers: number; }
interface OrderStatusBucket { status: string; count: number; }
interface TopItem { menuItem: string; name: string; quantity: number; revenue: number; }
interface TopUser { userId: string; name: string; email: string; level: number; }
interface TopSpender extends TopUser { spent: number; orders: number; }
interface TopSpinner extends TopUser { spins: number; xpEarned: number; pointsEarned: number; }
interface ChallengeCategoryStat { category: string; attempts: number; wins: number; winRate: number; }
interface CouponCode { code: string; name: string; type: string; usedCount: number; usageLimit: number | null; }

interface StatsResponse {
  totalUsers: number;
  totalOrders: number;
  activeToday: number;
  revenue: number;
  ordersChart: ChartPoint[];
  windowDays: number;
  ordersByStatus: OrderStatusBucket[];
  topItems: TopItem[];
  topSpenders: TopSpender[];
  topSpinners: TopSpinner[];
  challengeStats: {
    totalAttempts: number;
    totalWins: number;
    winRate: number;
    byCategory: ChallengeCategoryStat[];
  };
  couponStats: {
    activeCoupons: number;
    totalIssued: number;
    totalRedeemed: number;
    redeemRate: number;
    topCodes: CouponCode[];
  };
}

const STATUS_COLORS: Record<string, string> = {
  pending:     '#9ca3af',
  confirmed:   '#3b82f6',
  preparing:   '#f59e0b',
  ready:       '#a855f7',
  'on-the-way':'#06b6d4',
  delivered:   '#10b981',
  cancelled:   '#ef4444',
};

const CATEGORY_COLORS: Record<string, string> = {
  general:  '#ff6b35',
  student:  '#3b82f6',
  engineer: '#a855f7',
  doctor:   '#10b981',
  sports:   '#f59e0b',
  food:     '#ef4444',
  culture:  '#06b6d4',
};

const RANGES = [
  { days: 7,  label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
];

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = useCallback(async (windowDays: number) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/stats?days=${windowDays}`);
      setStats(data.data ?? data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(days); }, [load, days]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Last {days} days · live data</p>
        </div>
        <div className="card p-1 inline-flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                days === r.days
                  ? 'bg-brand-500 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-arena-700',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !stats ? (
        <SkeletonGrid />
      ) : !stats ? (
        <div className="card p-8 text-center text-gray-400">Failed to load analytics.</div>
      ) : (
        <>
          {/* Headline KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi icon={Users}       label="Total users"   value={formatNumber(stats.totalUsers)}            color="text-brand-500" />
            <Kpi icon={ShoppingBag} label="Total orders"  value={formatNumber(stats.totalOrders)}           color="text-blue-500"  />
            <Kpi icon={TrendingUp}  label="Active today"  value={formatNumber(stats.activeToday)}           color="text-green-500" />
            <Kpi icon={DollarSign}  label="Lifetime revenue" value={formatCurrency(stats.revenue)}          color="text-gold-500"  />
          </div>

          {/* Charts row 1: orders + revenue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Daily orders</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.ordersChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,125,125,0.15)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(days / 8))} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#ff6b35" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Revenue trend</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stats.ordersChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,125,125,0.15)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(days / 8))} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts row 2: new users + orders by status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">New users daily</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.ordersChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,125,125,0.15)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(days / 8))} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="newUsers" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Orders by status</h2>
              <div className="flex items-center gap-4 flex-wrap">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={stats.ordersByStatus.filter((s) => s.count > 0)}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={48}
                      outerRadius={80}
                    >
                      {stats.ordersByStatus.map((s) => (
                        <Cell key={s.status} fill={STATUS_COLORS[s.status] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 flex-1 min-w-[160px]">
                  {stats.ordersByStatus.map((s) => (
                    <div key={s.status} className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2 capitalize">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] }} />
                        <span className="text-gray-600 dark:text-gray-400">{s.status.replace('-', ' ')}</span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Charts row 3: top items + challenges */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Top 10 items (lifetime)</h2>
              {stats.topItems.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">No items ordered yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.topItems} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,125,125,0.15)" />
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="#a855f7" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Challenge win rate by category</h2>
              <p className="text-xs text-gray-500 mb-4">
                {stats.challengeStats.totalAttempts} attempts · {stats.challengeStats.totalWins} wins ·{' '}
                <span className="text-green-500 font-semibold">{stats.challengeStats.winRate}%</span> overall
              </p>
              {stats.challengeStats.byCategory.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">No challenge attempts yet</div>
              ) : (
                <div className="space-y-2">
                  {stats.challengeStats.byCategory.map((c) => (
                    <div key={c.category}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="capitalize text-gray-600 dark:text-gray-300 font-medium">{c.category}</span>
                        <span className="text-gray-500">
                          {c.wins}/{c.attempts} · <span className="font-semibold text-green-500">{c.winRate}%</span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-arena-700 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${c.winRate}%`, backgroundColor: CATEGORY_COLORS[c.category] || '#9ca3af' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Coupon stats card */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Ticket size={16} /> Coupon usage
              </h2>
              <div className="flex items-center gap-4 text-xs">
                <span><strong className="text-gray-900 dark:text-gray-100">{stats.couponStats.activeCoupons}</strong> active</span>
                <span><strong className="text-gray-900 dark:text-gray-100">{stats.couponStats.totalIssued}</strong> issued</span>
                <span><strong className="text-green-500">{stats.couponStats.totalRedeemed}</strong> redeemed</span>
                <span className="text-gray-500">{stats.couponStats.redeemRate}% redemption rate</span>
              </div>
            </div>

            {stats.couponStats.topCodes.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">No coupons created yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <tr className="border-b border-gray-100 dark:border-arena-700">
                      <th className="text-start py-2">Code</th>
                      <th className="text-start py-2">Name</th>
                      <th className="text-start py-2">Type</th>
                      <th className="text-end py-2">Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.couponStats.topCodes.map((c) => (
                      <tr key={c.code} className="border-b border-gray-50 dark:border-arena-700/50 last:border-0">
                        <td className="py-2 font-mono text-xs">{c.code}</td>
                        <td className="py-2 text-gray-700 dark:text-gray-200">{c.name}</td>
                        <td className="py-2 text-gray-500 capitalize">{c.type.replace(/_/g, ' ')}</td>
                        <td className="py-2 text-end font-semibold">
                          {c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top spenders + top spinners */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <Trophy size={16} /> Top spenders
              </h2>
              {stats.topSpenders.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400">No data yet</div>
              ) : (
                <div className="space-y-2">
                  {stats.topSpenders.map((u, i) => (
                    <LeaderRow key={u.userId} rank={i + 1} title={u.name} subtitle={u.email}
                      value={formatCurrency(u.spent)} sub={`${u.orders} orders · Lv ${u.level}`} />
                  ))}
                </div>
              )}
            </div>

            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                🎡 Top spinners
              </h2>
              {stats.topSpinners.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400">No spins yet</div>
              ) : (
                <div className="space-y-2">
                  {stats.topSpinners.map((u, i) => (
                    <LeaderRow key={u.userId} rank={i + 1} title={u.name} subtitle={u.email}
                      value={`${u.spins} spins`}
                      sub={`+${formatNumber(u.xpEarned)} XP · +${formatNumber(u.pointsEarned)} pts`} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={cn('w-10 h-10 rounded-xl bg-gray-50 dark:bg-arena-800 flex items-center justify-center shrink-0', color)}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{value}</p>
      </div>
    </div>
  );
}

function LeaderRow({ rank, title, subtitle, value, sub }: {
  rank: number; title: string; subtitle: string; value: string; sub: string;
}) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-arena-700/50">
      <div className="w-7 h-7 rounded-full bg-brand-gradient text-white text-xs font-bold flex items-center justify-center shrink-0">
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{title}</p>
        <p className="text-xs text-gray-500 truncate">{subtitle}</p>
      </div>
      <div className="text-end shrink-0">
        <p className="text-sm font-bold text-brand-500">{value}</p>
        <p className="text-[10px] text-gray-500">{sub}</p>
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-gray-100 dark:bg-arena-800 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 rounded-2xl bg-gray-100 dark:bg-arena-800 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
