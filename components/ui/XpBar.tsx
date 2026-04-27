'use client';

import { motion } from 'framer-motion';
import { cn, xpProgress } from '../../lib/utils';

interface XpBarProps {
  xp:        number;
  className?: string;
  showLabel?: boolean;
  compact?:   boolean;
}

export default function XpBar({ xp, className, showLabel = true, compact = false }: XpBarProps) {
  const { level, progress, required, percentage } = xpProgress(xp);

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span className={cn('font-display font-bold text-brand-500', compact ? 'text-xs' : 'text-sm')}>
            LVL {level}
          </span>
          <span className={cn('text-gray-400 dark:text-gray-500', compact ? 'text-xs' : 'text-xs')}>
            {progress.toLocaleString()} / {required.toLocaleString()} XP
          </span>
        </div>
      )}

      <div className="xp-bar">
        <motion.div
          className="xp-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
    </div>
  );
}
