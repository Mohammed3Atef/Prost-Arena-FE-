'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Zap, Gift, Copy, Check, LogOut, ShoppingBag, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '../../../store/useAuthStore';
import { useRouter } from 'next/navigation';
import XpBar from '../../../components/ui/XpBar';
import api from '../../../services/api/client';
import { formatNumber, xpProgress, formatCurrency } from '../../../lib/utils';
import toast from 'react-hot-toast';

interface UserReward { _id: string; reward: { name: string; type: string; discountPct: number }; status: string; createdAt: string; }
// /api/missions returns Mission fields spread directly, plus a userProgress object
interface UserMission {
  _id: string;
  title: string;
  description: string;
  target: number;
  type: string;
  userProgress: { progress: number; status: string };
}
interface RecentOrder { _id: string; orderNumber: string; status: string; total: number; createdAt: string; }

const LEVEL_TITLES = ['Newcomer','Regular','Food Lover','Challenger','Arena Fighter','Champion','Elite','Legend','Myth','God of Prost'];

export default function ProfilePage() {
  const { user, logout, refreshUser, isHydrated } = useAuthStore();
  const router = useRouter();
  const [rewards,      setRewards]      = useState<UserReward[]>([]);
  const [missions,     setMissions]     = useState<UserMission[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [copied,       setCopied]       = useState(false);

  useEffect(() => {
    if (!isHydrated) return;        // wait for Zustand to rehydrate from localStorage
    if (!user) { router.push('/login'); return; }
    refreshUser();
    api.get('/users/rewards').then((r) => setRewards(r.data.data ?? [])).catch(() => {});
    api.get('/missions').then((r) => setMissions((r.data.data ?? []).slice(0, 5))).catch(() => {});
    api.get('/orders', { params: { limit: 3 } }).then((r) => setRecentOrders(r.data.data ?? [])).catch(() => {});
  }, [isHydrated]);

  if (!isHydrated || !user) return null;

  const { level, progress, required, percentage } = xpProgress(user.xp);
  const levelTitle = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];

  const copyReferral = () => {
    navigator.clipboard.writeText(user.referralCode);
    setCopied(true);
    toast.success('Referral code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Profile card ─────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-arena-gradient p-6 text-white">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        </div>

        <div className="relative flex items-start gap-4">
          {/* Avatar */}
          <div className="level-ring">
            <div className="w-16 h-16 rounded-full bg-arena-700 flex items-center justify-center text-2xl font-display font-bold text-brand-500">
              {user.name?.charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{user.name}</h1>
            <p className="text-brand-300 text-sm">{levelTitle}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm">
              <span className="flex items-center gap-1"><Zap size={14} className="text-gold-400" />{formatNumber(user.xp)} XP</span>
              <span className="flex items-center gap-1"><Star size={14} className="text-gold-400" />{formatNumber(user.points)} pts</span>
              <span className="flex items-center gap-1"><Trophy size={14} className="text-gold-400" />{user.challengeWins ?? 0} wins</span>
            </div>
          </div>

          <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors">
            <LogOut size={16} />
          </button>
        </div>

        {/* XP bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Level {level}</span>
            <span>{progress.toLocaleString()} / {required.toLocaleString()} XP</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-gold-500" />
          </div>
        </div>
      </motion.div>

      {/* ── Referral ──────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <Gift size={18} className="text-brand-500" /> Referral Code
        </h2>
        <div className="flex items-center gap-3">
          <code className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-arena-700 rounded-xl font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
            {user.referralCode}
          </code>
          <button onClick={copyReferral} className="btn-primary py-2.5 px-4 gap-2">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Share your code — you both earn XP when they place their first order.
        </p>
      </motion.div>

      {/* ── Recent Orders ─────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ShoppingBag size={18} className="text-brand-500" /> Recent Orders
          </h2>
          <Link href="/orders" className="text-xs text-brand-500 hover:text-brand-600 font-semibold flex items-center gap-1">
            View all <ChevronRight size={13} />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No orders yet — <Link href="/menu" className="text-brand-500 hover:underline">browse the menu!</Link></p>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((o) => (
              <Link key={o._id} href={`/orders/${o._id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-arena-700 transition-colors group">
                <div>
                  <span className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">#{o.orderNumber}</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                    o.status === 'delivered' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                    o.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-500' :
                    'bg-brand-100 dark:bg-brand-900/30 text-brand-600'}`}>{o.status.replace(/_/g,' ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(o.total)}</span>
                  <ChevronRight size={14} className="text-gray-400 group-hover:text-brand-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Missions ──────────────────────────────────────────────────── */}
      {missions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Active Missions</h2>
          <div className="space-y-3">
            {missions.map((m) => {
              const progress = m.userProgress?.progress ?? 0;
              const pct = m.target > 0 ? Math.min(100, Math.floor((progress / m.target) * 100)) : 0;
              return (
                <div key={m._id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{m.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-arena-600 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{progress}/{m.target}</span>
                    </div>
                  </div>
                  {m.userProgress?.status === 'completed' && (
                    <button className="btn-primary py-1 px-3 text-xs">Claim</button>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Rewards inventory ─────────────────────────────────────────── */}
      {rewards.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Your Rewards</h2>
          <div className="grid grid-cols-2 gap-3">
            {rewards.slice(0, 4).map((r) => (
              <div key={r._id} className="p-3 rounded-xl bg-gradient-to-br from-brand-50 dark:from-arena-700 to-transparent border border-brand-100 dark:border-arena-600">
                <div className="text-2xl mb-1">🎁</div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{r.reward.name}</p>
                <span className="badge-brand mt-1">Active</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

    </div>
  );
}
