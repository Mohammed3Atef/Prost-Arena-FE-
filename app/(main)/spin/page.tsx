'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import SpinWheelCanvas from '../../../components/gamification/SpinWheelCanvas';
import api from '../../../services/api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import ResultPopup from '../../../components/ui/ResultPopup';
import { useLocale } from '../../../components/layout/LocaleProvider';

export default function SpinPage() {
  const { user, refreshUser, isHydrated } = useAuthStore();
  const router  = useRouter();
  const { t } = useLocale();
  const [wheel,  setWheel]  = useState<any>(null);
  const [avail,  setAvail]  = useState<{ canSpin: boolean; secondsLeft: number; bonusSpins: number } | null>(null);
  const [result, setResult] = useState<any>(null);
  const [popupOpen, setPopupOpen] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) { router.push('/login'); return; }
    api.get('/spin/wheel').then((r) => setWheel(r.data.data)).catch(() => toast.error(t('spin.couldNotLoad')));
    api.get('/spin/available').then((r) => setAvail(r.data.data)).catch(() => setAvail({ canSpin: false, secondsLeft: 0, bonusSpins: 0 }));
  }, [isHydrated]);

  const handleSpin = async () => {
    setAvail((p) => p ? { ...p, canSpin: false } : null);
    try {
      const { data } = await api.post('/spin');
      return data.data;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('spin.spinFailed'));
      api.get('/spin/available').then((r) => setAvail(r.data.data)).catch(() => {});
      throw err;
    }
  };

  const handleComplete = (spinResult: any) => {
    setResult(spinResult);
    setPopupOpen(true);
    api.get('/spin/available').then((r) => setAvail(r.data.data)).catch(() => {});
    refreshUser();
  };

  const hoursLeft = avail ? Math.ceil(avail.secondsLeft / 3600) : 0;

  return (
    <div className="max-w-lg mx-auto text-center space-y-8">
      <div>
        <h1 className="section-title">{t('spin.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('spin.subtitle')}</p>
        {avail && avail.bonusSpins > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-600 dark:text-brand-400 text-sm font-semibold">
            <Zap size={15} className="text-brand-500" />
            {t(avail.bonusSpins !== 1 ? 'spin.bonusSpinsPlural' : 'spin.bonusSpins', { count: avail.bonusSpins })}
          </motion.div>
        )}
      </div>

      {/* Wheel */}
      {wheel ? (
        <SpinWheelCanvas
          segments={wheel.segments ?? []}
          disabled={!(avail?.canSpin ?? false)}
          onSpin={handleSpin}
          onComplete={handleComplete}
        />
      ) : (
        <div className="h-72 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Cooldown */}
      {avail && !avail.canSpin && avail.secondsLeft > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="card p-4 text-sm text-gray-500 dark:text-gray-400">
          {t('spin.cooldown', { hours: hoursLeft })}
        </motion.div>
      )}

      <ResultPopup
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        tone={result?.segment?.type === 'empty' ? 'lose' : 'win'}
        title={
          result?.segment?.type === 'empty'
            ? t('spin.noPrize')
            : t('spin.youWon', { prize: result?.segment?.label ?? '' })
        }
        description={
          result?.segment?.type === 'empty'
            ? t('spin.noPrizeSub')
            : result?.reward
              ? t('spin.rewardAdded')
              : t('spin.enjoy')
        }
        primaryLabel={result?.reward ? t('spin.viewMyRewards') : t('spin.awesome')}
        onPrimary={() => { if (result?.reward) router.push('/profile'); }}
        secondaryLabel={t('common.close')}
      />
    </div>
  );
}
