'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import SpinWheelCanvas from '../../../components/gamification/SpinWheelCanvas';
import api from '../../../services/api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function SpinPage() {
  const { user, refreshUser, isHydrated } = useAuthStore();
  const router  = useRouter();
  const [wheel, setWheel]   = useState<any>(null);
  const [avail, setAvail]   = useState<{ canSpin: boolean; secondsLeft: number; bonusSpins: number } | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!isHydrated) return;        // wait for Zustand to rehydrate from localStorage
    if (!user) { router.push('/login'); return; }
    api.get('/spin/wheel')
      .then((r) => setWheel(r.data.data))
      .catch(() => toast.error('Could not load spin wheel'));
    api.get('/spin/available')
      .then((r) => setAvail(r.data.data))
      .catch(() => setAvail({ canSpin: false, secondsLeft: 0, bonusSpins: 0 }));
  }, [isHydrated]);

  /**
   * Called by SpinWheelCanvas when the user clicks Spin.
   * We IMMEDIATELY lock canSpin so re-clicks are impossible during the animation.
   * The result is NOT shown here — onComplete handles that after the wheel stops.
   */
  const handleSpin = async () => {
    // Immediately block another spin
    setAvail((p) => p ? { ...p, canSpin: false } : null);
    try {
      const { data } = await api.post('/spin');
      return data.data; // returned to SpinWheelCanvas to drive the animation
    } catch (err: any) {
      // Restore if the API failed
      const msg = err?.response?.data?.message || 'Spin failed — try again';
      toast.error(msg);
      // Re-fetch real availability
      api.get('/spin/available').then((r) => setAvail(r.data.data)).catch(() => {});
      throw err;
    }
  };

  /**
   * Called by SpinWheelCanvas AFTER the 4.5-second animation completes.
   * This is when the result card should appear.
   */
  const handleComplete = (spinResult: any) => {
    setResult(spinResult);
    const isEmptySlot = spinResult?.segment?.type === 'empty';
    if (isEmptySlot) {
      toast('Better luck next time! 🍀', { icon: '😔', duration: 4000 });
    } else {
      const label = spinResult?.segment?.label ?? 'a prize';
      toast.success(`🎉 You won: ${label}!`, { duration: 4000 });
    }
    // Sync availability & XP with server
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

      {wheel ? (
        <SpinWheelCanvas
          segments={wheel.segments}
          onSpin={handleSpin}
          onComplete={handleComplete}
          disabled={!avail?.canSpin}
        />
      ) : (
        <div className="h-80 skeleton rounded-full mx-auto w-80" />
      )}

      {avail && !avail.canSpin && avail.secondsLeft > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ⏳ Next free spin available in <strong className="text-gray-700 dark:text-gray-200">{hoursLeft}h</strong>
          </p>
        </motion.div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="card p-6 text-center space-y-3"
          >
            {result.segment.type === 'empty' ? (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.4, delay: 0.1 }}
                  className="text-6xl"
                >😔</motion.div>
                <h3 className="font-display text-xl font-bold text-gray-900 dark:text-gray-100">
                  Better luck next time!
                </h3>
                <p className="text-sm text-gray-400">Come back tomorrow for another free spin</p>
              </>
            ) : (
              <>
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
                  className="text-6xl"
                >🎉</motion.div>
                <h3 className="font-display text-xl font-bold text-gray-900 dark:text-gray-100">
                  You won: {result.segment.label}!
                </h3>
                {result.xpAwarded > 0 && (
                  <p className="text-brand-500 font-semibold text-lg">+{result.xpAwarded} XP</p>
                )}
                {result.pointsAwarded > 0 && (
                  <p className="text-gold-500 font-semibold">+{result.pointsAwarded} Points</p>
                )}
                {result.userReward && (
                  <p className="text-green-500 font-semibold">🎁 Reward added to your inventory!</p>
                )}
              </>
            )}
            <button
              onClick={() => setResult(null)}
              className="btn-secondary text-sm py-2 px-4 mt-2"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Segments legend */}
      {wheel && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Possible Prizes</h3>
          <div className="grid grid-cols-2 gap-2">
            {wheel.segments.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-gray-600 dark:text-gray-400 truncate">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
