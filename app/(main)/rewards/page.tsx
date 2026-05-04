'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Gift, Lock, Sparkles, Tag, Truck, Zap, Star, ShoppingBag } from 'lucide-react';
import api from '../../../services/api/client';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/useAuthStore';
import { useLocale } from '../../../components/layout/LocaleProvider';
import { useCart } from '../../../hooks/useCart';
import { useRouter } from 'next/navigation';
import { cn } from '../../../lib/utils';

interface Reward {
  _id: string;
  name: string;
  description: string;
  icon: string | null;
  type: 'discount_pct' | 'discount_fixed' | 'free_item' | 'xp_boost' | 'points_grant' | 'free_delivery';
  discountPct: number;
  discountFixed: number;
  pointsAmount: number;
  xpBoostMultiplier: number;
  code?: string;
  expiresAt: string | null;
}

interface UserReward {
  _id: string;
  reward: Reward | null;
  status: 'active' | 'used' | 'expired';
  expiresAt: string | null;
  source: string;
  createdAt: string;
}

const SOURCE_LABEL: Record<string, string> = {
  spin_wheel:    'rewards.sourceSpin',
  challenge_win: 'rewards.sourceChallenge',
  mission:       'rewards.sourceMission',
  referral:      'rewards.sourceReferral',
  manual:        'rewards.sourceManual',
  level_up:      'rewards.sourceLevelUp',
};

function rewardIcon(type: Reward['type']) {
  switch (type) {
    case 'discount_pct':
    case 'discount_fixed': return <Tag size={20} />;
    case 'free_delivery':  return <Truck size={20} />;
    case 'xp_boost':       return <Zap size={20} />;
    case 'points_grant':   return <Star size={20} />;
    case 'free_item':      return <ShoppingBag size={20} />;
    default: return <Gift size={20} />;
  }
}

function rewardValue(r: Reward, t: (k: string, vars?: Record<string, string | number>) => string) {
  switch (r.type) {
    case 'discount_pct':   return t('rewards.valuePct',   { value: r.discountPct });
    case 'discount_fixed': return t('rewards.valueFixed', { value: r.discountFixed });
    case 'free_delivery':  return t('rewards.valueFreeDelivery');
    case 'xp_boost':       return t('rewards.valueXpBoost', { value: r.xpBoostMultiplier });
    case 'points_grant':   return t('rewards.valuePoints',  { value: r.pointsAmount });
    case 'free_item':      return t('rewards.valueFreeItem');
    default: return '';
  }
}

export default function RewardsPage() {
  const { user, isHydrated } = useAuthStore();
  const { t } = useLocale();
  const { applyReward } = useCart();
  const router = useRouter();
  const [rewards, setRewards] = useState<UserReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/rewards/mine');
      setRewards(data.data ?? []);
    } catch {
      setRewards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) return;
    load();
  }, [isHydrated, user, load]);

  const useInCart = async (ur: UserReward) => {
    setApplying(ur._id);
    try {
      await applyReward(ur._id);
      toast.success(t('rewards.appliedToCart'));
      router.push('/cart');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t('rewards.applyFailed'));
    } finally {
      setApplying(null);
    }
  };

  if (!isHydrated) return null;

  if (!user) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto">
        <Lock size={32} className="mx-auto text-gray-300 dark:text-arena-600 mb-3" />
        <p className="text-gray-500 dark:text-gray-400 mb-4">{t('rewards.loginToView')}</p>
        <a href="/login" className="btn-primary inline-flex">{t('nav.login')}</a>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="section-title">{t('rewards.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('rewards.subtitle')}</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-arena-800 animate-pulse" />
          ))}
        </div>
      ) : rewards.length === 0 ? (
        <div className="card p-12 text-center">
          <Sparkles size={32} className="mx-auto text-gray-300 dark:text-arena-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 mb-1 font-semibold">{t('rewards.empty')}</p>
          <p className="text-xs text-gray-400">{t('rewards.emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rewards.map((ur, i) => {
            if (!ur.reward) return null;
            const r = ur.reward;
            const expiresAt = ur.expiresAt || r.expiresAt;
            const daysLeft = expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000)) : null;
            const isApplicableToCart = r.type === 'discount_pct' || r.type === 'discount_fixed' || r.type === 'free_delivery';
            return (
              <motion.div
                key={ur._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center',
                    'bg-gradient-to-br from-brand-400 to-brand-600 text-white',
                  )}>
                    {r.icon ? <span className="text-2xl">{r.icon}</span> : rewardIcon(r.type)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{r.name}</h3>
                        {r.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.description}</p>
                        )}
                      </div>
                      <span className="font-bold text-brand-500 text-lg shrink-0">{rewardValue(r, t)}</span>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                      {r.code && (
                        <span className="font-mono font-bold tracking-wider px-2 py-1 rounded-md bg-gray-50 dark:bg-arena-800 border border-gray-100 dark:border-arena-600 text-gray-700 dark:text-gray-200">
                          {r.code}
                        </span>
                      )}
                      <span>{t(SOURCE_LABEL[ur.source] || 'rewards.sourceManual')}</span>
                      {daysLeft !== null && (
                        <span className={cn(daysLeft <= 3 ? 'text-amber-600 dark:text-amber-400 font-semibold' : '')}>
                          {daysLeft === 0
                            ? t('rewards.expiresToday')
                            : t('rewards.expiresInDays', { days: daysLeft })}
                        </span>
                      )}
                    </div>

                    {isApplicableToCart && (
                      <div className="pt-1">
                        <button
                          onClick={() => useInCart(ur)}
                          disabled={applying === ur._id}
                          className="btn-primary py-1.5 px-4 text-sm"
                        >
                          <ShoppingBag size={14} />
                          {applying === ur._id ? t('common.loading') : t('rewards.useInCart')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
