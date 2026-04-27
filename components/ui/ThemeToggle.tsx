'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../theme/ThemeProvider';
import { cn } from '../../lib/utils';

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <motion.button
      onClick={toggleTheme}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      className={cn(
        'relative flex items-center justify-center rounded-full transition-colors duration-300',
        'bg-gray-100 dark:bg-arena-700 hover:bg-gray-200 dark:hover:bg-arena-600',
        compact ? 'w-8 h-8' : 'w-10 h-10',
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <motion.div
        key={isDark ? 'dark' : 'light'}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0,   opacity: 1 }}
        exit={{    rotate:  90, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {isDark
          ? <Sun size={compact ? 14 : 18} className="text-gold-400" />
          : <Moon size={compact ? 14 : 18} className="text-arena-700 dark:text-gray-300" />}
      </motion.div>
    </motion.button>
  );
}
