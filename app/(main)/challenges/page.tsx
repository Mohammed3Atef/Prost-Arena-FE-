'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, CheckCircle2, XCircle, Award } from 'lucide-react';
import api from '../../../services/api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { cn } from '../../../lib/utils';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface Question { _id: string; text: string; options: string[]; }
interface Challenge { _id: string; type: string; category: string; questions: Question[]; timeLimit: number; reward: { xp: number; points: number; discountPct: number }; }

type Phase = 'select' | 'playing' | 'result';

const CATEGORIES = ['general','student','engineer','doctor','sports','food','culture'] as const;

export default function ChallengePage() {
  const { user, isHydrated } = useAuthStore();
  const router               = useRouter();
  const [phase,     setPhase]     = useState<Phase>('select');
  const [category,  setCategory]  = useState<string>('general');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [qIndex,    setQIndex]    = useState(0);
  const [answers,   setAnswers]   = useState<{ answeredIndex: number }[]>([]);
  const [selected,  setSelected]  = useState<number | null>(null);
  const [timeLeft,  setTimeLeft]  = useState(30);
  const [result,    setResult]    = useState<any>(null);
  const [loading,   setLoading]   = useState(false);
  const [noQuestions, setNoQuestions] = useState(false);

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) { handleTimeout(); return; }
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  const startChallenge = async () => {
    if (!user) { router.push('/login'); return; }
    setLoading(true);
    setNoQuestions(false);
    try {
      const { data } = await api.get(`/challenges/daily?category=${category}`);
      const challengeData = data.data;

      if (!challengeData?.questions?.length) {
        setNoQuestions(true);
        return;
      }

      setChallenge(challengeData);
      setPhase('playing');
      setQIndex(0);
      setAnswers([]);
      setSelected(null);
      setTimeLeft(challengeData.timeLimit || 30);
    } catch (e: any) {
      const msg: string = e?.response?.data?.message || '';
      const isNoQuestions = e?.response?.status === 404 || msg.toLowerCase().includes('no questions');
      if (isNoQuestions) {
        setNoQuestions(true);
      } else {
        toast.error(msg || 'Failed to load challenge');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (index: number) => {
    if (selected !== null) return;
    setSelected(index);

    setTimeout(() => {
      const newAnswers = [...answers, { answeredIndex: index }];
      setAnswers(newAnswers);

      if (qIndex + 1 < (challenge?.questions.length ?? 0)) {
        setQIndex((p) => p + 1);
        setSelected(null);
        setTimeLeft(challenge?.timeLimit || 30);
      } else {
        submitAnswers(newAnswers);
      }
    }, 800);
  };

  const handleTimeout = () => {
    const newAnswers = [...answers, { answeredIndex: -1 }];
    setAnswers(newAnswers);
    if (qIndex + 1 < (challenge?.questions.length ?? 0)) {
      setQIndex((p) => p + 1);
      setSelected(null);
      setTimeLeft(challenge?.timeLimit || 30);
    } else {
      submitAnswers(newAnswers);
    }
  };

  const submitAnswers = async (finalAnswers: typeof answers) => {
    if (!challenge) return;
    setPhase('result');
    try {
      const { data } = await api.post(`/challenges/daily/${challenge._id}/submit`, { answers: finalAnswers });
      setResult(data.data);
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Submission failed';
      toast.error(msg);
      setResult({ score: 0, total: challenge.questions.length, allCorrect: false, xpAwarded: 0, pointsAwarded: 0 });
    }
  };

  const currentQ = challenge?.questions[qIndex];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="section-title">Daily Challenges</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Get all correct → win big rewards</p>
      </div>

      <AnimatePresence mode="wait">

        {/* ── Category selection ─────────────────────────────────────── */}
        {phase === 'select' && (
          <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="card p-4 sm:p-6 space-y-5">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Choose your category</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {CATEGORIES.map((c) => (
                  <button key={c} onClick={() => { setCategory(c); setNoQuestions(false); }}
                    className={cn('py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl text-sm font-medium capitalize transition-all',
                      category === c ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-arena-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200')}>
                    {c}
                  </button>
                ))}
              </div>

              {/* No questions available notice */}
              {noQuestions && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                  <span className="text-2xl">📭</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">No questions yet for this category</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      Try a different category, or ask an admin to add questions from the dashboard.
                    </p>
                  </div>
                </motion.div>
              )}

              <div className="p-4 rounded-xl bg-gradient-to-r from-brand-50 dark:from-arena-700 to-transparent border border-brand-100 dark:border-arena-600">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">🏆 Rewards</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">All correct → 100 XP + 50 points + 10% discount</p>
              </div>
              <button onClick={startChallenge} disabled={loading} className="btn-primary w-full py-4">
                {loading ? 'Loading…' : '⚡ Start Challenge'}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Playing ────────────────────────────────────────────────── */}
        {phase === 'playing' && !currentQ && (
          <motion.div key="loading-q" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="card p-12 text-center text-gray-400">
            <div className="text-4xl mb-3">⏳</div>
            <p>Loading questions…</p>
          </motion.div>
        )}
        {phase === 'playing' && currentQ && (
          <motion.div key={`q-${qIndex}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <div className="card p-4 sm:p-6 space-y-4 sm:space-y-5">
              {/* Progress & timer */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Question {qIndex + 1} / {challenge!.questions.length}
                </span>
                <div className={cn('flex items-center gap-1.5 font-mono font-bold text-sm px-3 py-1 rounded-full',
                  timeLeft <= 10 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-arena-700 text-gray-700 dark:text-gray-300')}>
                  <Timer size={14} />
                  {timeLeft}s
                </div>
              </div>

              {/* Timer bar */}
              <div className="h-1.5 bg-gray-100 dark:bg-arena-700 rounded-full overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', timeLeft <= 10 ? 'bg-red-500' : 'bg-brand-500')}
                  animate={{ width: `${(timeLeft / (challenge!.timeLimit || 30)) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{currentQ.text}</h3>

              <div className="space-y-3">
                {currentQ.options.map((opt, i) => (
                  <motion.button
                    key={i}
                    onClick={() => handleSelect(i)}
                    disabled={selected !== null}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'w-full text-left px-4 py-3.5 rounded-xl border text-sm font-medium transition-all',
                      selected === null
                        ? 'border-gray-200 dark:border-arena-600 bg-white dark:bg-arena-700 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-arena-600 text-gray-900 dark:text-gray-100'
                        : selected === i
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-gray-100 dark:border-arena-600 bg-gray-50 dark:bg-arena-800 text-gray-400 dark:text-gray-500',
                    )}
                  >
                    <span className="font-bold mr-3 text-brand-400">{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Result ─────────────────────────────────────────────────── */}
        {phase === 'result' && result && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="card p-5 sm:p-8 text-center space-y-4 sm:space-y-5">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
                className="text-7xl">{result.allCorrect ? '🏆' : result.score > result.total / 2 ? '⭐' : '😤'}</motion.div>
              <div>
                <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {result.allCorrect ? 'PERFECT!' : result.score > result.total / 2 ? 'Nice Try!' : 'Keep Practising!'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{result.score} / {result.total} correct</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-brand-50 dark:bg-arena-700">
                  <div className="text-xl font-bold text-gradient">+{result.xpAwarded}</div>
                  <div className="text-xs text-gray-500">XP Earned</div>
                </div>
                <div className="p-3 rounded-xl bg-gold-50 dark:bg-arena-700">
                  <div className="text-xl font-bold text-gold-500">+{result.pointsAwarded}</div>
                  <div className="text-xs text-gray-500">Points</div>
                </div>
              </div>

              {result.allCorrect && result.discountPct > 0 && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white">
                  <Award size={24} className="mx-auto mb-2" />
                  <p className="font-bold">🎉 {result.discountPct}% Discount Unlocked!</p>
                  <p className="text-xs text-brand-100 mt-1">Check your rewards to use it</p>
                </div>
              )}

              <button onClick={() => setPhase('select')} className="btn-primary w-full py-4">
                Play Again
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
