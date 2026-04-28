"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Crown } from "lucide-react";
import api from "../../../services/api/client";
import { useAuthStore } from "../../../store/useAuthStore";
import { formatNumber, cn } from "../../../lib/utils";
import { useLocale } from "../../../components/layout/LocaleProvider";

interface LeaderboardEntry {
  _id: string;
  name: string;
  avatar: string | null;
  level: number;
  xp: number;
  score: number;
  rank: number;
}

const TABS = [
  {
    key: "xp",
    labelKey: "leaderboard.tabXp",
    labelFullKey: "leaderboard.tabXpFull",
  },
  {
    key: "wins",
    labelKey: "leaderboard.tabPvp",
    labelFullKey: "leaderboard.tabPvpFull",
  },
  {
    key: "orders",
    labelKey: "leaderboard.tabOrders",
    labelFullKey: "leaderboard.tabOrdersFull",
  },
] as const;
type Tab = (typeof TABS)[number]["key"];

const RANK_ICONS = [
  <Crown key={1} size={20} className="text-yellow-400" />,
  <Medal key={2} size={20} className="text-gray-400" />,
  <Trophy key={3} size={20} className="text-amber-600" />,
];
const RANK_COLORS = [
  "from-yellow-500/20 to-yellow-500/5 border-yellow-400/30",
  "from-gray-400/20 to-gray-400/5 border-gray-400/30",
  "from-amber-600/20 to-amber-600/5 border-amber-600/30",
];

function scoreSuffix(tab: Tab, t: (k: string) => string) {
  if (tab === "xp") return t("leaderboard.xpUnit");
  if (tab === "wins") return t("leaderboard.winsUnit");
  if (tab === "orders") return t("leaderboard.ordersUnit");
  return "";
}

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const { t } = useLocale();
  const [tab, setTab] = useState<Tab>("xp");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/leaderboard?type=${tab}&limit=20`)
      .then((r) => setEntries(r.data.data ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="section-title flex items-center gap-2">
          <Trophy className="text-yellow-500" size={28} />{" "}
          {t("leaderboard.title")}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {t("leaderboard.subtitle")}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 dark:bg-arena-800 p-1 rounded-xl">
        {TABS.map((tabDef) => (
          <button
            key={tabDef.key}
            onClick={() => setTab(tabDef.key)}
            className={cn(
              "flex-1 py-2 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-medium transition-all",
              tab === tabDef.key
                ? "bg-white dark:bg-arena-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300",
            )}
          >
            <span className="sm:hidden">{t(tabDef.labelKey)}</span>
            <span className="hidden sm:inline">{t(tabDef.labelFullKey)}</span>
          </button>
        ))}
      </div>

      {/* Top 3 podium */}
      {!loading && entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 items-end">
          {[entries[1], entries[0], entries[2]].map((entry, podiumIdx) => {
            const rank = podiumIdx === 1 ? 1 : podiumIdx === 0 ? 2 : 3;
            const heights = ["h-32", "h-36", "h-28"];
            return (
              <motion.div
                key={entry._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: podiumIdx * 0.1 }}
                className={cn(
                  "flex flex-col items-center justify-between gap-1.5 p-3 rounded-2xl border bg-gradient-to-b",
                  RANK_COLORS[rank - 1],
                  heights[podiumIdx],
                )}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {entry.name?.charAt(0).toUpperCase()}
                </div>
                <div className="text-center leading-tight min-w-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[80px]">
                    {entry.name?.split(" ")[0]}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {formatNumber(entry.score)}
                  </p>
                </div>
                <div className="shrink-0">{RANK_ICONS[rank - 1]}</div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div className="card overflow-hidden divide-y divide-gray-50 dark:divide-arena-700">
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
              <div className="w-8 h-8 bg-gray-200 dark:bg-arena-700 rounded-full" />
              <div className="h-4 bg-gray-200 dark:bg-arena-700 rounded w-32" />
              <div className="h-4 bg-gray-200 dark:bg-arena-700 rounded w-16 ms-auto" />
            </div>
          ))
        ) : entries.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Trophy size={48} className="mx-auto mb-3 opacity-30" />
            <p>{t("leaderboard.noData")}</p>
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
                  "flex items-center gap-4 px-4 py-3",
                  isMe && "bg-brand-50 dark:bg-brand-900/10",
                )}
              >
                <div className="w-7 text-center">
                  {i < 3 ? (
                    RANK_ICONS[i]
                  ) : (
                    <span className="text-sm font-bold text-gray-400">
                      #{i + 1}
                    </span>
                  )}
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {entry.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-semibold truncate",
                      isMe
                        ? "text-brand-600 dark:text-brand-400"
                        : "text-gray-900 dark:text-gray-100",
                    )}
                  >
                    {entry.name}{" "}
                    {isMe && (
                      <span className="text-xs font-normal">
                        {t("leaderboard.you")}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {t("leaderboard.level", { level: entry.level })}
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {formatNumber(entry.score)}
                  </p>
                  <p className="text-xs text-gray-400">{scoreSuffix(tab, t)}</p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
