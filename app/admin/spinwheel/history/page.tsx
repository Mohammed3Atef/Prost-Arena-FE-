'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Zap, Star, Gift, RefreshCw } from 'lucide-react';
import api from '../../../../services/api/client';
import { cn, formatNumber } from '../../../../lib/utils';

interface SpinLog {
  _id: string;
  user: { _id: string; name: string; email: string; level: number } | null;
  segmentLabel: string;
  segmentIndex: number;
  xpAwarded: number;
  pointsAwarded: number;
  reward: { _id: string; name: string; code: string | null; type: string } | null;
  createdAt: string;
}

interface ListResponse {
  items: SpinLog[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function SpinHistoryPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/spin-logs?page=${p}&limit=25`);
      setData(data.data ?? data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page); }, [load, page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link
            href="/admin/spinwheel"
            className="text-xs text-gray-400 hover:text-brand-500 inline-flex items-center gap-1"
          >
            <ArrowLeft size={12} /> Back to spin wheel
          </Link>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-900 dark:text-gray-100 mt-1">
            Spin history
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Every spin, who took it, and what they won
          </p>
        </div>
        <button
          onClick={() => load(page)}
          className="btn-ghost p-2"
          title="Refresh"
        >
          <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
        </button>
      </div>

      {loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-gray-100 dark:bg-arena-800 animate-pulse" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">🎡</p>
          <p>No spins yet</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-arena-700/50">
                  <tr>
                    {['User', 'Segment won', 'Reward', 'XP', 'Points', 'When'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-start text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((log, i) => (
                    <motion.tr
                      key={log._id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-t border-gray-50 dark:border-arena-700/50"
                    >
                      <td className="px-4 py-3">
                        {log.user ? (
                          <>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{log.user.name}</p>
                            <p className="text-xs text-gray-500">{log.user.email} · Lv {log.user.level}</p>
                          </>
                        ) : (
                          <p className="text-gray-400">Deleted user</p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">
                        {log.segmentLabel}
                      </td>
                      <td className="px-4 py-3">
                        {log.reward ? (
                          <div className="flex items-center gap-1.5">
                            <Gift size={12} className="text-purple-500 shrink-0" />
                            <span className="text-xs">{log.reward.name}</span>
                            {log.reward.code && (
                              <span className="font-mono text-[10px] bg-gray-100 dark:bg-arena-700 px-1.5 py-0.5 rounded">
                                {log.reward.code}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {log.xpAwarded > 0 ? (
                          <span className="inline-flex items-center gap-1 text-brand-500 font-semibold">
                            <Zap size={11} /> +{formatNumber(log.xpAwarded)}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {log.pointsAwarded > 0 ? (
                          <span className="inline-flex items-center gap-1 text-gold-500 font-semibold">
                            <Star size={11} /> +{formatNumber(log.pointsAwarded)}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('en', {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {data.pages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Page {data.page} of {data.pages} · {data.total} total
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={data.page <= 1}
                  className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                  disabled={data.page >= data.pages}
                  className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
