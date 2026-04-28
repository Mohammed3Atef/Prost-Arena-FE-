'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import XpBar from '../../../components/ui/XpBar';
import api from '../../../services/api/client';
import { formatNumber } from '../../../lib/utils';
import { useSiteSettings } from '../../../components/layout/SiteSettingsProvider';
import { useLocale } from '../../../components/layout/LocaleProvider';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item    = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } };

/** Render a hero title that supports {{accent:WORD}} for the brand-gradient highlight. */
function renderHeroTitle(template: string) {
  const parts: Array<{ text: string; accent: boolean }> = [];
  const re = /\{\{accent:([^}]+)\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template)) !== null) {
    if (m.index > last) parts.push({ text: template.slice(last, m.index), accent: false });
    parts.push({ text: m[1], accent: true });
    last = m.index + m[0].length;
  }
  if (last < template.length) parts.push({ text: template.slice(last), accent: false });
  return parts.map((p, i) =>
    p.accent
      ? <span key={i} className="text-gradient">{p.text}</span>
      : <span key={i}>{p.text}</span>
  );
}

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const { settings } = useSiteSettings();
  const { t } = useLocale();
  const [platformStats, setPlatformStats] = useState<{ totalUsers: number; totalOrders: number; totalRewards: number } | null>(null);

  useEffect(() => {
    api.get('/admin/public-stats').then((r) => setPlatformStats(r.data.data)).catch(() => {});
  }, []);

  const activeBanners = (settings.banners ?? [])
    .filter((b) => b.isActive)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const featured = (settings.featuredItems ?? []) as Array<{
    _id: string; name: string; description?: string; price?: number; image?: string | null;
  }>;

  return (
    <div className="space-y-10 sm:space-y-12">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-3xl bg-arena-gradient py-10 px-5 sm:py-14 sm:px-8 text-white text-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-20 -left-20 w-72 h-72 bg-brand-500/20 rounded-full blur-3xl" />
          <motion.div animate={{ x: [0, -30, 0], y: [0, 20, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="absolute -bottom-20 -right-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          {settings.heroBadge && (
            <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="inline-block badge-brand mb-4 text-sm">{settings.heroBadge}</motion.p>
          )}
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="font-display text-4xl sm:text-6xl font-black mb-4 leading-tight">
            {renderHeroTitle(settings.heroTitle)}
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-gray-300 text-lg max-w-xl mx-auto mb-8">
            {settings.heroSubtitle}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4">
            <Link href={settings.heroPrimaryCta.href} className="btn-primary text-lg px-8 py-4">
              {settings.heroPrimaryCta.label} <ArrowRight size={20} />
            </Link>
            {!user && settings.heroSecondaryCta?.label && (
              <Link href={settings.heroSecondaryCta.href} className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold px-8 py-4 rounded-xl transition-all">
                {settings.heroSecondaryCta.label}
              </Link>
            )}
          </motion.div>
          {user && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="mt-8 max-w-sm mx-auto bg-white/10 backdrop-blur rounded-2xl p-4 text-start">
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

      {/* ── Promo banners (admin-controlled) ── */}
      {activeBanners.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeBanners.slice(0, 4).map((b) => (
            <Link
              key={String(b._id ?? b.title)}
              href={b.ctaUrl || '#'}
              className="card group relative overflow-hidden p-6 sm:p-8 flex items-center gap-4 hover:shadow-lg transition-shadow"
            >
              {b.image && (
                <img src={b.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity" />
              )}
              <div className="relative z-10">
                <h3 className="font-display font-bold text-lg text-gray-900 dark:text-gray-100">{b.title}</h3>
                {b.subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{b.subtitle}</p>}
                {b.ctaLabel && (
                  <span className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-brand-500">
                    {b.ctaLabel} <ArrowRight size={14} />
                  </span>
                )}
              </div>
            </Link>
          ))}
        </section>
      )}

      {/* ── Feature cards (admin-controlled) ── */}
      <section>
        <h2 className="section-title text-center mb-8">{t('home.featuresTitle')}</h2>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {settings.featureCards.map((f) => (
            <motion.div key={`${f.href}-${f.title}`} variants={item}>
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

      {/* ── Featured items (admin-controlled) ── */}
      {featured.length > 0 && (
        <section>
          <h2 className="section-title text-center mb-8">{t('home.featuredTitle')}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.slice(0, 8).map((f) => (
              <Link key={f._id} href={`/menu`} className="card overflow-hidden group">
                {f.image && (
                  <div className="aspect-square w-full overflow-hidden bg-gray-100 dark:bg-arena-700">
                    <img src={f.image} alt={f.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                )}
                <div className="p-3">
                  <p className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">{f.name}</p>
                  {typeof f.price === 'number' && (
                    <p className="text-xs text-brand-500 font-bold mt-0.5">${f.price.toFixed(2)}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Stats ── */}
      <section className="bg-arena-gradient rounded-3xl p-5 sm:p-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-white text-center">
          {[
            { icon: '👥', label: t('home.stats.players'),    value: platformStats ? `${formatNumber(platformStats.totalUsers)}+`   : '—' },
            { icon: '🛒', label: t('home.stats.delivered'),  value: platformStats ? `${formatNumber(platformStats.totalOrders)}+`  : '—' },
            { icon: '🎁', label: t('home.stats.rewards'),    value: platformStats ? `${formatNumber(platformStats.totalRewards)}+` : '—' },
            { icon: '🎡', label: t('home.stats.spinsToday'), value: '∞' },
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
