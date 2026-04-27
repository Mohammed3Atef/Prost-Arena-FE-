'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import XpBar from '../../../components/ui/XpBar';
import api from '../../../services/api/client';
import { formatNumber } from '../../../lib/utils';

const FEATURES = [
  { icon: '🍔', title: 'Order & Earn XP',  desc: 'Every order levels you up', href: '/menu',       color: 'from-brand-500 to-brand-600'   },
  { icon: '⚡', title: 'Daily Challenges',  desc: 'Win big discounts daily',  href: '/challenges',  color: 'from-gold-500 to-gold-600'     },
  { icon: '🎡', title: 'Spin the Wheel',    desc: 'Free daily spin awaits',   href: '/spin',        color: 'from-purple-500 to-purple-600' },
  { icon: '🏆', title: 'Leaderboard',       desc: 'Compete with the city',    href: '/leaderboard', color: 'from-green-500 to-green-600'   },
];

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item    = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } };

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const [platformStats, setPlatformStats] = useState<{ totalUsers: number; totalOrders: number; totalRewards: number } | null>(null);

  useEffect(() => {
    api.get('/admin/public-stats').then((r) => setPlatformStats(r.data.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-16">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-3xl bg-arena-gradient py-16 px-8 text-white text-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-20 -left-20 w-72 h-72 bg-brand-500/20 rounded-full blur-3xl" />
          <motion.div animate={{ x: [0, -30, 0], y: [0, 20, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="absolute -bottom-20 -right-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="inline-block badge-brand mb-4 text-sm">🎮 Gamified Food Experience</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="font-display text-4xl sm:text-6xl font-black mb-4 leading-tight">
            EAT. PLAY. <span className="text-gradient">WIN.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-gray-300 text-lg max-w-xl mx-auto mb-8">
            Order food, crush challenges, spin the wheel, and climb the leaderboard. Every meal is an adventure.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/menu" className="btn-primary text-lg px-8 py-4">
              Start Ordering <ArrowRight size={20} />
            </Link>
            {!user && (
              <Link href="/register" className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold px-8 py-4 rounded-xl transition-all">
                Create Account
              </Link>
            )}
          </motion.div>
          {user && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="mt-8 max-w-sm mx-auto bg-white/10 backdrop-blur rounded-2xl p-4 text-left">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-brand-500 flex items-center justify-center text-white text-lg font-bold">
                  {user.level}
                </div>
                <div>
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-xs text-gray-400">{user.points.toLocaleString()} points</p>
                </div>
              </div>
              <XpBar xp={user.xp} />
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Feature Cards ── */}
      <section>
        <h2 className="section-title text-center mb-8">What&apos;s in the Arena</h2>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <motion.div key={f.href} variants={item}>
              <Link href={f.href} className="card flex flex-col items-center text-center p-6 gap-3 group hover:shadow-lg transition-shadow">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-2xl group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{f.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{f.desc}</p>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Stats ── */}
      <section className="bg-arena-gradient rounded-3xl p-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-white text-center">
          {[
            { icon: '👥', label: 'Arena Players',    value: platformStats ? `${formatNumber(platformStats.totalUsers)}+`   : '—' },
            { icon: '🛒', label: 'Orders Delivered', value: platformStats ? `${formatNumber(platformStats.totalOrders)}+`  : '—' },
            { icon: '🎁', label: 'Rewards Given',    value: platformStats ? `${formatNumber(platformStats.totalRewards)}+` : '—' },
            { icon: '🎡', label: 'Spins Today',      value: '∞' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-4xl mb-2">{s.icon}</p>
              <p className="text-2xl sm:text-3xl font-black">{s.value}</p>
              <p className="text-sm text-gray-300 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
