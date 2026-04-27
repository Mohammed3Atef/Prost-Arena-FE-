'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Star, Crown } from 'lucide-react';
import api from '../../../services/api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { formatNumber } from '../../../lib/utils';
import { cn } from '../../../lib/utils';

interface LeaderboardEntry {
  _id:    string;
  name:   string;
  avatar: string | null;
  level:  number;
  xp:     number;
  score:  number;
  rank:   number;
}

const TABS = [
  { key: 'xp',    label: 'XP',      labelFull: 'XP Leaders'   },
  { key: 'wins',  label: 'PvP',     labelFull: 'PvP Wins'     },
  { key: 'orders',label: 'Orders',  labelFull: 'Top Orderers' },
] as const;
type Tab = typeof TABS[number]['key'];

const RANK_ICONS = [
  <Crown  key={1} size={20} className="text-gold-400" />,
  <Medal  key={2} size={20} className="text-gray-400" />,
  <Trophy key={3} size={20} className="text-amber-600" />,
];

const RANK_COLORS = [
  'from-gold-500/20 to-gold-500/5 border-gold-400/30',
  'from-gray-400/20 to-gray-400/5 border-gray-400/30',
  'from-amber-600/20 to-amber-600/5 border-amber-600/30',
];

export default function LeaderboardPage() {
  const { user }  = useAuthStore();
  const [tab, setTab] = useState<Tab>('xp');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/leaderboard?type=${tab}&limit=20`)
      .then((r) => setEntries(r.data.data ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <Trophy className="text-gold-500" size={28} />
            Leaderboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Compete with players across the city
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 dark:bg-arena-800 p-1 rounded-xl">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 py-2 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap',
              tab === t.key
                ? 'bg-white dark:bg-arena-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
            )}
          >
            <span className="sm:hidden">{t.label}</span>
            <span className="hidden sm:inline">{t.labelFull}</span>
          </button>
        ))}
      </div>

      {/* Top 3 podium */}
      {!loading && entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 mb-2">
          {[entries[1], entries[0], entries[2]].map((entry, podiumIdx) => {
            const rank = podiumIdx === 1 ? 1 : podiumIdx === 0 ? 2 : 3;
            const heights = ['h-24', 'h-32', 'h-20'];
            return (
              <motion.div
                key={entry._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: podiumIdx * 0.1 }}
                className={cn(
                  'flex flex-col items-center justify-end gap-2 p-3 rounded-2xl border bg-gradient-to-b',
                  RANK_COLORS[rank - 1],
                  heights[podiumIdx],
                )}
              >
                <div className="w-10 h-10 rounded-full bg-arena-gradient flex items-center justify-center text-white font-display font-bold text-sm">
                  {entry.name?.charAt(0).toUpperCase()}
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[80px]">
                    {entry.name?.split(' ')[0]}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatNumber(entry.score)}
                  </p>
                </div>
                <div>{RANK_ICONS[rank - 1]}</div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div className="card overflow-hidden divide-y divide-gray-50 dark:divide-arena-700">
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="skeleton w-8 h-8 rounded-full" />
              <div className="skeleton h-4 w-32 rounded" />
              <div className="skeleton h-4 w-16 rounded ml-auto" />
            </div>
          ))
        ) : entries.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Trophy size={48} className="mx-auto mb-3 opacity-30" />
            <p>No data yet — be the first!</p>
          </div>
        ) : (
          entries.map((entry, i) => {
            const isMe = user?._id === entry._id;
            return (
              <motion.div
                key={entry._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  'flex items-center gap-4 px-4 py-3 transition-colors',
                  isMe && 'bg-brand-50 dark:bg-brand-900/10',
                )}
              >
                {/* Rank */}
                <div className="w-7 text-center">
                  {i < 3 ? RANK_ICONS[i] : (
                    <span className="text-sm font-bold text-gray-400">#{i + 1}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-arena-gradient flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {entry.name?.charAt(0).toUpperCase()}
                </div>

                {/* Name + level */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-semibold truncate',
                    isMe ? 'text-brand-600 dark:text-brand-400' : 'text-gray-900 dark:text-gray-100',
                  )}>
                    {entry.name} {isMe && <span className="text-xs font-normal">(you)</span>}
                  </p>
                  <p className="text-xs text-gray-400">Level {entry.level}</p>
                </div>

                {/* Score */}
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {formatNumber(entry.score)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {tab === 'xp' ? 'XP' : tab === 'wins' ? 'wins' : 'orders'}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
