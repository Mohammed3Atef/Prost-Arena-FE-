'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer } from 'lucide-react';
import api from '../../../services/api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { cn } from '../../../lib/utils';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useLocale } from '../../../components/layout/LocaleProvider';
import { useSiteSettings } from '../../../components/layout/SiteSettingsProvider';

interface Question  { _id: string; text: string; options: string[]; }
interface Challenge { _id: string; type: string; category: string; questions: Question[]; timeLimit: number; reward: { xp: number; points: number; discountPct: number }; }
type Phase = 'select' | 'playing' | 'result';

const CATEGORIES = ['general','student','engineer','doctor','sports','food','culture'] as const;

export default function ChallengePage() {
  const { user, isHydrated } = useAuthStore();
  const router               = useRouter();
  const { t } = useLocale();
  const { settings } = useSiteSettings();
  const [phase,       setPhase]       = useState<Phase>('select');
  const [category,    setCategory]    = useState('general');
  const [challenge,   setChallenge]   = useState<Challenge | null>(null);
  const [qIndex,      setQIndex]      = useState(0);
  const [answers,     setAnswers]     = useState<{ answeredIndex: number }[]>([]);
  const [selected,    setSelected]    = useState<number | null>(null);
  const [timeLeft,    setTimeLeft]    = useState(30);
  const [result,      setResult]      = useState<any>(null);
  const [loading,     setLoading]     = useState(false);
  const [noQuestions, setNoQuestions] = useState(false);

  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) { handleTimeout(); return; }
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  const startChallenge = async () => {
    if (!isHydrated) return;
    if (!user) { router.push('/login'); return; }
    setLoading(true); setNoQuestions(false);
    try {
      const { data } = await api.get(`/challenges/daily?category=${category}`);
      const c = data.data;
      if (!c?.questions?.length) { setNoQuestions(true); return; }
      setChallenge(c); setPhase('playing'); setQIndex(0); setAnswers([]); setSelected(null); setTimeLeft(c.timeLimit || 30);
    } catch (e: any) {
      const msg = e?.response?.data?.message || '';
      if (e?.response?.status === 404 || msg.toLowerCase().includes('no question')) setNoQuestions(true);
      else toast.error(msg || t('challenges.loadFailed'));
    } finally { setLoading(false); }
  };

  const handleSelect = (index: number) => {
    if (selected !== null) return;
    setSelected(index);
    setTimeout(() => {
      const newAnswers = [...answers, { answeredIndex: index }];
      setAnswers(newAnswers);
      if (qIndex + 1 < (challenge?.questions.length ?? 0)) {
        setQIndex((p) => p + 1); setSelected(null); setTimeLeft(challenge?.timeLimit || 30);
      } else { submitAnswers(newAnswers); }
    }, 800);
  };

  const handleTimeout = () => {
    const newAnswers = [...answers, { answeredIndex: -1 }];
    setAnswers(newAnswers);
    if (qIndex + 1 < (challenge?.questions.length ?? 0)) {
      setQIndex((p) => p + 1); setSelected(null); setTimeLeft(challenge?.timeLimit || 30);
    } else { submitAnswers(newAnswers); }
  };

  const submitAnswers = async (finalAnswers: typeof answers) => {
    if (!challenge) return;
    setPhase('result');
    try {
      const { data } = await api.post(`/challenges/daily/${challenge._id}/submit`, { answers: finalAnswers });
      setResult(data.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t('challenges.submitFailed'));
      setResult({ score: 0, total: challenge.questions.length, allCorrect: false, xpAwarded: 0, pointsAwarded: 0 });
    }
  };

  const currentQ = challenge?.questions[qIndex];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="section-title">{t('challenges.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('challenges.subtitle')}</p>
      </div>
      <AnimatePresence mode="wait">

        {/* Select */}
        {phase === 'select' && (
          <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="card p-4 sm:p-6 space-y-5">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('challenges.chooseCategory')}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {CATEGORIES.map((c) => (
                  <button key={c} onClick={() => { setCategory(c); setNoQuestions(false); }}
                    className={cn('py-2.5 px-3 rounded-xl text-sm font-medium capitalize transition-all',
                      category === c ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-arena-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200')}>
                    {t(`challenges.category${c.charAt(0).toUpperCase()}${c.slice(1)}`)}
                  </button>
                ))}
              </div>
              {noQuestions && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 flex gap-3">
                  <span className="text-2xl">📭</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t('challenges.noQuestions')}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{t('challenges.noQuestionsHint')}</p>
                  </div>
                </motion.div>
              )}
              <div className="p-4 rounded-xl bg-brand-50 dark:bg-arena-700 border border-brand-100 dark:border-arena-600">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('challenges.rewardsLabel')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('challenges.rewardsSummary', {
                    xp:     settings.dailyChallengeReward?.xp          ?? 100,
                    points: settings.dailyChallengeReward?.points      ?? 50,
                    pct:    settings.dailyChallengeReward?.discountPct ?? 10,
                  })}
                </p>
              </div>
              <button onClick={startChallenge} disabled={loading} className="btn-primary w-full py-4">
                {loading ? t('common.loading') : t('challenges.startChallenge')}
              </button>
            </div>
          </motion.div>
        )}

        {/* Playing */}
        {phase === 'playing' && currentQ && (
          <motion.div key={`q-${qIndex}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <div className="card p-4 sm:p-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('challenges.questionOf', { current: qIndex + 1, total: challenge!.questions.length })}</span>
                <div className={cn('flex items-center gap-1.5 font-mono font-bold text-sm px-3 py-1 rounded-full',
                  timeLeft <= 10 ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-gray-100 dark:bg-arena-700 text-gray-700 dark:text-gray-300')}>
                  <Timer size={14} />{timeLeft}s
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-arena-700 rounded-full overflow-hidden">
                <motion.div className={cn('h-full rounded-full', timeLeft <= 10 ? 'bg-red-500' : 'bg-brand-500')}
                  animate={{ width: `${(timeLeft / (challenge!.timeLimit || 30)) * 100}%` }} transition={{ duration: 0.5 }} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{currentQ.text}</h3>
              <div className="space-y-3">
                {currentQ.options.map((opt, i) => (
                  <motion.button key={i} onClick={() => handleSelect(i)} disabled={selected !== null} whileTap={{ scale: 0.98 }}
                    className={cn('w-full text-start px-4 py-3.5 rounded-xl border text-sm font-medium transition-all',
                      selected === null
                        ? 'border-gray-200 dark:border-arena-600 bg-white dark:bg-arena-700 hover:border-brand-400 text-gray-900 dark:text-gray-100'
                        : selected === i
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-gray-100 dark:border-arena-600 bg-gray-50 dark:bg-arena-800 text-gray-400')}>
                    <span className="font-bold me-3 text-brand-400">{String.fromCharCode(65 + i)}.</span>{opt}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Result */}
        {phase === 'result' && result && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="card p-6 sm:p-8 text-center space-y-5">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
                className="text-7xl">{result.allCorrect ? '🏆' : result.score > result.total / 2 ? '🎯' : '😅'}</motion.div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {result.allCorrect ? t('challenges.perfectScore') : t('challenges.scoreOf', { score: result.score, total: result.total })}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  {result.allCorrect ? t('challenges.perfectMsg') : t('challenges.keepPracticing')}
                </p>
              </div>
              {(result.xpAwarded > 0 || result.pointsAwarded > 0) && (
                <div className="flex justify-center gap-6">
                  {result.xpAwarded   > 0 && <div className="text-center"><p className="text-2xl font-black text-brand-500">+{result.xpAwarded}</p><p className="text-xs text-gray-500">{t('profile.xpUnit')}</p></div>}
                  {result.pointsAwarded > 0 && <div className="text-center"><p className="text-2xl font-black text-yellow-500">+{result.pointsAwarded}</p><p className="text-xs text-gray-500">{t('challenges.pointsLabel')}</p></div>}
                </div>
              )}
              {result.discountCoupon && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4">
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">{t('challenges.couponEarned')}</p>
                  <p className="font-mono font-bold text-green-600 dark:text-green-300 mt-1">{result.discountCoupon}</p>
                </div>
              )}
              <button onClick={() => { setPhase('select'); setResult(null); setChallenge(null); }} className="btn-primary w-full py-3.5">
                {t('challenges.playAgain')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
