'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, ChevronRight, Clock, CheckCircle, XCircle, ChefHat, Truck, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../../services/api/client';
import { useAuthStore } from '../../../store/useAuthStore';
import { formatCurrency, cn } from '../../../lib/utils';
import { useLocale } from '../../../components/layout/LocaleProvider';

interface Order {
  _id: string; orderNumber: string; status: string;
  total: number; items: { name: string; quantity: number }[];
  createdAt: string; xpEarned?: number;
}

const STATUS_CONFIG: Record<string, { labelKey: string; color: string; icon: React.ElementType }> = {
  pending:    { labelKey: 'profile.statusPending',    color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',  icon: Clock },
  confirmed:  { labelKey: 'profile.statusConfirmed',  color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',        icon: CheckCircle },
  preparing:  { labelKey: 'profile.statusPreparing',  color: 'text-brand-500 bg-brand-50 dark:bg-brand-900/20',     icon: ChefHat },
  ready:      { labelKey: 'profile.statusReady',      color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',  icon: Package },
  delivered:  { labelKey: 'profile.statusDelivered',  color: 'text-green-500 bg-green-50 dark:bg-green-900/20',     icon: CheckCircle },
  cancelled:  { labelKey: 'profile.statusCancelled',  color: 'text-red-500 bg-red-50 dark:bg-red-900/20',           icon: XCircle },
  out_for_delivery: { labelKey: 'profile.statusOnTheWay', color: 'text-teal-500 bg-teal-50 dark:bg-teal-900/20', icon: Truck },
};

export default function OrdersPage() {
  const { user, isHydrated } = useAuthStore();
  const router               = useRouter();
  const { t, locale } = useLocale();
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;        // wait for Zustand to rehydrate from localStorage
    if (!user) { router.push('/login'); return; }
  }, [isHydrated]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/orders', { params: { page, limit: 10 } });
      setOrders((p) => page === 1 ? (data.data ?? []) : [...p, ...(data.data ?? [])]);
      setHasMore(data.pagination?.hasNext ?? false);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="section-title">{t('profile.ordersTitle')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('profile.ordersSubtitle')}</p>
      </div>

      {loading && page === 1 ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="card p-12 text-center space-y-4">
          <ShoppingBag size={48} className="mx-auto text-gray-300 dark:text-gray-600" />
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300">{t('profile.noOrdersHero')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('profile.placeFirstOrder')}</p>
          </div>
          <Link href="/menu" className="btn-primary inline-flex">{t('cart.browseMenu')}</Link>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {orders.map((order, i) => {
            const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            return (
              <motion.div key={order._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link href={`/orders/${order._id}`}
                  className="card p-5 flex items-center gap-4 hover:shadow-md transition-all group">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', cfg.color)}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">#{order.orderNumber}</span>
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', cfg.color)}>{t(cfg.labelKey)}</span>
                      {order.xpEarned && order.xpEarned > 0 && (
                        <span className="text-xs text-brand-500 font-medium">+{order.xpEarned} XP</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {order.items?.map((it) => `${it.name} ×${it.quantity}`).join(', ')}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{formatCurrency(order.total, locale)}</p>
                    <ChevronRight size={16} className="ms-auto text-gray-400 group-hover:text-brand-500 transition-colors mt-1 rtl:rotate-180" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
          {hasMore && (
            <button onClick={() => setPage((p) => p + 1)} disabled={loading}
              className="w-full py-3 text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors">
              {loading ? t('common.loading') : t('profile.loadMoreOrders')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
