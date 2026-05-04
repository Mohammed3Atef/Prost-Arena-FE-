'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Gift, Zap, Target, Lock, Sparkles } from 'lucide-react';
import api from '../../../services/api/client';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/useAuthStore';
import { useLocale } from '../../../components/layout/LocaleProvider';
import { cn } from '../../../lib/utils';

interface MissionReward { xp: number; points: number; rewardId: string | null; }
interface UserMissionProgress {
  progress: number;
  status: 'active' | 'completed' | 'claimed' | 'expired';
}
interface Mission {
  _id: string;
  title: string;
  description: string;
  icon: string | null;
  type: string;
  target: number;
  reward: MissionReward;
  isRepeatable: boolean;
  repeatEvery: 'daily' | 'weekly' | 'monthly' | null;
  expiresAt: string | null;
  userProgress: UserMissionProgress;
}

const TYPE_ICONS: Record<string, string> = {
  order_count:    '🛒',
  order_new_item: '🍔',
  challenge_win:  '🏆',
  referral:       '👥',
  spin:           '🎡',
  login_streak:   '🔥',
  spend_amount:   '💰',
};

export default function MissionsPage() {
  const { user, isHydrated } = useAuthStore();
  const { t } = useLocale();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/missions');
      setMissions(data.data ?? []);
    } catch {
      setMissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) return;
    load();
  }, [isHydrated, user, load]);

  const claim = async (m: Mission) => {
    setClaiming(m._id);
    try {
      const { data } = await api.post(`/missions/${m._id}/claim`);
      const r = data.data;
      const parts: string[] = [];
      if (r.xpAwarded)     parts.push(`+${r.xpAwarded} XP`);
      if (r.pointsAwarded) parts.push(`+${r.pointsAwarded} pts`);
      if (r.userReward)    parts.push(t('missions.rewardEarned'));
      toast.success(parts.join(' · ') || t('missions.claimed'));
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t('missions.claimFailed'));
    } finally {
      setClaiming(null);
    }
  };

  if (!isHydrated) return null;

  if (!user) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto">
        <Lock size={32} className="mx-auto text-gray-300 dark:text-arena-600 mb-3" />
        <p className="text-gray-500 dark:text-gray-400 mb-4">{t('missions.loginToView')}</p>
        <a href="/login" className="btn-primary inline-flex">{t('nav.login')}</a>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="section-title">{t('missions.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('missions.subtitle')}</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 dark:bg-arena-800 animate-pulse" />
          ))}
        </div>
      ) : missions.length === 0 ? (
        <div className="card p-12 text-center">
          <Sparkles size={32} className="mx-auto text-gray-300 dark:text-arena-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{t('missions.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {missions.map((m, i) => {
            const progress = m.userProgress.progress ?? 0;
            const target   = m.target || 1;
            const pct = Math.min(100, Math.round((progress / target) * 100));
            const status = m.userProgress.status;
            const isCompleted = status === 'completed';
            const isClaimed   = status === 'claimed';
            return (
              <motion.div
                key={m._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={cn(
                  'card p-4 sm:p-5 space-y-3',
                  isClaimed && 'opacity-60',
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl shrink-0">
                    {m.icon || TYPE_ICONS[m.type] || '⭐'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{m.title}</h3>
                      {isClaimed && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-100 dark:bg-arena-700 text-gray-500">
                          {t('missions.claimedBadge')}
                        </span>
                      )}
                      {isCompleted && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                          {t('missions.readyBadge')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{m.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-arena-700 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        isCompleted ? 'bg-green-500' : 'bg-gradient-to-r from-brand-400 to-brand-600',
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 shrink-0">
                    {progress}/{target}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                  <div className="flex items-center gap-3 text-xs">
                    {m.reward.xp > 0 && (
                      <span className="flex items-center gap-1 text-brand-500 font-semibold">
                        <Zap size={12} /> +{m.reward.xp} XP
                      </span>
                    )}
                    {m.reward.points > 0 && (
                      <span className="flex items-center gap-1 text-gold-500 font-semibold">
                        <Target size={12} /> +{m.reward.points} pts
                      </span>
                    )}
                    {m.reward.rewardId && (
                      <span className="flex items-center gap-1 text-purple-500 font-semibold">
                        <Gift size={12} /> {t('missions.rewardCoupon')}
                      </span>
                    )}
                  </div>

                  {isCompleted && (
                    <button
                      onClick={() => claim(m)}
                      disabled={claiming === m._id}
                      className="btn-primary py-1.5 px-4 text-sm"
                    >
                      <Trophy size={14} />
                      {claiming === m._id ? t('common.loading') : t('missions.claim')}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
