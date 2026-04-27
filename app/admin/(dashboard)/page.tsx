'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, ShoppingBag, Trophy, TrendingUp, ArrowUpRight, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import api from '../../../services/api/client';
import { formatNumber } from '../../../lib/utils';

interface Stats {
  totalUsers:   number;
  totalOrders:  number;
  activeToday:  number;
  revenue:      number;
  recentOrders: any[];
  ordersChart:  { date: string; orders: number; revenue: number }[];
}

const STAT_CARDS = [
  { key: 'totalUsers',  label: 'Total Users',   icon: Users,       color: 'from-blue-500 to-blue-600',   suffix: '' },
  { key: 'totalOrders', label: 'Total Orders',  icon: ShoppingBag, color: 'from-brand-500 to-brand-600', suffix: '' },
  { key: 'activeToday', label: 'Active Today',  icon: TrendingUp,  color: 'from-green-500 to-green-600', suffix: '' },
  { key: 'revenue',     label: 'Revenue',       icon: ArrowUpRight,color: 'from-gold-500 to-gold-600',   suffix: '$' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Partial<Stats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats')
      .then(({ data }) => {
        const s = data.data ?? data;
        setStats({
          totalUsers:   s.totalUsers   ?? 0,
          totalOrders:  s.totalOrders  ?? 0,
          activeToday:  s.activeToday  ?? 0,
          revenue:      s.revenue      ?? 0,
          recentOrders: s.recentOrders ?? [],
          ordersChart:  (s.ordersChart ?? []).map((d: any) => ({
            date:    d.date,
            orders:  d.orders  ?? d.count ?? 0,
            revenue: d.revenue ?? 0,
          })),
        });
      })
      .catch(() => {
        // fallback to mock if endpoint not ready
        setStats({ totalUsers: 0, totalOrders: 0, activeToday: 0, revenue: 0, recentOrders: [], ordersChart: generateMockChart() });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Welcome back, Admin 👋</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, suffix }, i) => (
          <motion.div key={key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="card p-3 sm:p-5 flex items-center gap-3">
            <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white shrink-0`}>
              <Icon size={16} className="sm:hidden" />
              <Icon size={20} className="hidden sm:block" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{label}</p>
              <p className="text-lg sm:text-2xl font-display font-bold text-gray-900 dark:text-gray-100">
                {loading ? '…' : `${suffix}${formatNumber((stats as any)[key] ?? 0)}`}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Orders per day */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Orders (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.ordersChart ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="orders" fill="#ff6b35" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue line */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Revenue (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.ordersChart ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent orders table */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <Clock size={16} /> Recent Orders
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-arena-700">
                <th className="pb-3 font-medium">Order #</th>
                <th className="pb-3 font-medium">Customer</th>
                <th className="pb-3 font-medium">Total</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-arena-700">
              {(stats.recentOrders ?? []).map((order: any) => (
                <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-arena-700/50 transition-colors">
                  <td className="py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{order.orderNumber}</td>
                  <td className="py-3 text-gray-900 dark:text-gray-100">{order.user?.name || order.guestInfo?.name || 'Guest'}</td>
                  <td className="py-3 font-semibold text-gray-900 dark:text-gray-100">${order.total?.toFixed(2)}</td>
                  <td className="py-3">
                    <span className={`badge text-xs ${
                      order.status === 'delivered' ? 'badge-green' :
                      order.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/20 text-red-600' :
                      'badge-brand'
                    }`}>{order.status}</span>
                  </td>
                </tr>
              ))}
              {(stats.recentOrders ?? []).length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-gray-400">No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function generateMockChart() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date:    d.toLocaleDateString('en', { weekday: 'short' }),
      orders:  Math.floor(Math.random() * 80 + 20),
      revenue: Math.floor(Math.random() * 2000 + 500),
    };
  });
}
}

function generateMockChart() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date:    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      orders:  Math.floor(Math.random() * 20),
      revenue: Math.floor(Math.random() * 500),
    };
  });
}
