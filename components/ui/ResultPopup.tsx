'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import Modal from './Modal';
import { cn } from '../../lib/utils';

export type ResultTone = 'win' | 'lose' | 'level-up' | 'achievement';

interface ResultPopupProps {
  open:         boolean;
  onClose:      () => void;
  tone?:        ResultTone;
  emoji?:       string;
  title:        ReactNode;
  description?: ReactNode;
  primaryLabel?: string;
  onPrimary?:   () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  children?:    ReactNode;
}

const TONE: Record<ResultTone, { gradient: string; emoji: string; ring: string }> = {
  win:         { gradient: 'from-brand-500 via-orange-500 to-amber-500', emoji: '🎉', ring: 'ring-brand-500/40' },
  lose:        { gradient: 'from-gray-500 via-gray-600 to-gray-700',     emoji: '😔', ring: 'ring-gray-400/30' },
  'level-up':  { gradient: 'from-violet-500 via-fuchsia-500 to-pink-500', emoji: '🚀', ring: 'ring-fuchsia-500/40' },
  achievement: { gradient: 'from-gold-500 via-amber-500 to-yellow-500', emoji: '🏆', ring: 'ring-gold-500/40' },
};

/**
 * Confetti-ish burst of emoji particles for celebratory tones.
 * Pure CSS/JS — no external dep.
 */
function Burst({ emoji, count = 14 }: { emoji: string; count?: number }) {
  const [seeds] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 320,
      y: -(Math.random() * 220 + 60),
      r: (Math.random() - 0.5) * 720,
      d: Math.random() * 0.4,
      s: 0.7 + Math.random() * 0.7,
    }))
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {seeds.map((s) => (
        <motion.span
          key={s.id}
          initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: s.s }}
          animate={{ x: s.x, y: s.y, opacity: [0, 1, 1, 0], rotate: s.r }}
          transition={{ duration: 1.6, delay: s.d, ease: 'easeOut' }}
          className="absolute left-1/2 top-1/2 text-2xl"
          aria-hidden
        >
          {emoji}
        </motion.span>
      ))}
    </div>
  );
}

export default function ResultPopup({
  open,
  onClose,
  tone = 'win',
  emoji,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  children,
}: ResultPopupProps) {
  const t = TONE[tone];
  const display = emoji ?? t.emoji;
  const celebratory = tone === 'win' || tone === 'level-up' || tone === 'achievement';

  // Brief haptic-style toast on open
  useEffect(() => {
    if (!open || !celebratory) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate?.([20, 40, 20]); } catch { /* ignore */ }
    }
  }, [open, celebratory]);

  return (
    <Modal
      open={open}
      onOpenChange={(o) => { if (!o) onClose(); }}
      size="sm"
      showClose
      a11yTitle={typeof title === 'string' ? title : 'Result'}
      className="!p-0 overflow-hidden"
    >
      <div className="relative -mx-5 sm:-mx-6 -mt-2">
        <div className={cn('relative h-32 bg-gradient-to-br flex items-center justify-center', t.gradient)}>
          {celebratory && <Burst emoji={display} />}
          <motion.div
            initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 14, delay: 0.05 }}
            className={cn(
              'relative w-20 h-20 rounded-full bg-white flex items-center justify-center text-5xl shadow-xl ring-4',
              t.ring
            )}
          >
            {display}
          </motion.div>
        </div>

        <div className="px-5 sm:px-6 pt-5 pb-4 text-center space-y-2">
          <h3 className="text-xl font-display font-bold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {description}
            </p>
          )}
          {children}
        </div>

        {(primaryLabel || secondaryLabel) && (
          <div className="px-5 sm:px-6 pb-5 flex flex-col-reverse sm:flex-row sm:justify-center gap-2">
            {secondaryLabel && (
              <button
                type="button"
                onClick={() => { onSecondary?.(); onClose(); }}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-arena-700 transition-colors"
              >
                {secondaryLabel}
              </button>
            )}
            {primaryLabel && (
              <button
                type="button"
                onClick={() => { onPrimary?.(); onClose(); }}
                className="btn-primary px-6 py-2.5 text-sm"
              >
                {primaryLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
