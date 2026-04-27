'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import SpinWheelCanvas from '../../../components/gamification/SpinWheelCanvas';
import api from '../../../services/api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function SpinPage() {
  const { user, refreshUser, isHydrated } = useAuthStore();
  const router  = useRouter();
  const [wheel,  setWheel]  = useState<any>(null);
  const [avail,  setAvail]  = useState<{ canSpin: boolean; secondsLeft: number; bonusSpins: number } | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) { router.push('/login'); return; }
    api.get('/spin/wheel').then((r) => setWheel(r.data.data)).catch(() => toast.error('Could not load spin wheel'));
    api.get('/spin/available').then((r) => setAvail(r.data.data)).catch(() => setAvail({ canSpin: false, secondsLeft: 0, bonusSpins: 0 }));
  }, [isHydrated]);

  const handleSpin = async () => {
    setAvail((p) => p ? { ...p, canSpin: false } : null);
    try {
      const { data } = await api.post('/spin');
      return data.data;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Spin failed — try again');
      api.get('/spin/available').then((r) => setAvail(r.data.data)).catch(() => {});
      throw err;
    }
  };

  const handleComplete = (spinResult: any) => {
    setResult(spinResult);
    if (spinResult?.segment?.type === 'empty') {
      toast('Better luck next time! 🍀', { icon: '😔', duration: 4000 });
    } else {
      toast.success(`🎉 You won: ${spinResult?.segment?.label ?? 'a prize'}!`, { duration: 4000 });
    }
    api.get('/spin/available').then((r) => setAvail(r.data.data)).catch(() => {});
    refreshUser();
  };

  const hoursLeft = avail ? Math.ceil(avail.secondsLeft / 3600) : 0;

  return (
    <div className="max-w-lg mx-auto text-center space-y-8">
      <div>
        <h1 className="section-title">Daily Spin Wheel</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">One free spin every 24 hours</p>
        {avail && avail.bonusSpins > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-600 dark:text-brand-400 text-sm font-semibold">
            <Zap size={15} className="text-brand-500" />
            {avail.bonusSpins} bonus spin{avail.bonusSpins !== 1 ? 's' : ''} available!
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
          Next spin available in <span className="font-semibold text-brand-500">{hoursLeft}h</span>
        </motion.div>
      )}

      {/* Result card */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="card p-6 space-y-3">
          <p className="text-4xl">{result.segment?.type === 'empty' ? '😔' : '🎉'}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {result.segment?.type === 'empty' ? 'No prize this time' : `You won: ${result.segment?.label}`}
          </p>
          {result.reward && (
            <p className="text-sm text-brand-500 font-semibold">
              Reward added to your account!
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
