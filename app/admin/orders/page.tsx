'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight, X, MapPin, Phone, Package } from 'lucide-react';
import api from '../../../services/api/client';
import { formatCurrency, cn } from '../../../lib/utils';
import toast from 'react-hot-toast';

interface OrderItem { name: string; quantity: number; price: number; subtotal: number; }
interface Order {
  _id: string; orderNumber: string; status: string; total: number;
  items: OrderItem[]; createdAt: string;
  user: { name: string; email: string } | null;
  guestInfo: { name: string; phone: string; email?: string } | null;
  deliveryAddress: { street: string; city: string } | null;
  xpEarned: number;
}

const STATUSES = ['pending','confirmed','preparing','ready','out_for_delivery','delivered','cancelled'];
const STATUS_COLORS: Record<string, string> = {
  pending:          'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  confirmed:        'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  preparing:        'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400',
  ready:            'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  out_for_delivery: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
  delivered:        'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  cancelled:        'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const NEXT_STATUS: Record<string, string> = {
  pending: 'confirmed', confirmed: 'preparing', preparing: 'ready',
  ready: 'out_for_delivery', out_for_delivery: 'delivered',
};

export default function AdminOrdersPage() {
  const [orders,   setOrders]   = useState<Order[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('');
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);
  const [selected, setSelected] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: String(LIMIT) };
    if (status) params.status = status;
    if (search) params.search = search;
    try {
      const { data } = await api.get('/admin/orders', { params });
      setOrders(data.data ?? []);
      setTotal(data.pagination?.total ?? 0);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  }, [page, status, search]);

  useEffect(() => { setPage(1); }, [status, search]);
  useEffect(() => { load(); }, [load]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdating(true);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      setOrders((p) => p.map((o) => o._id === orderId ? { ...o, status: newStatus } : o));
      if (selected?._id === orderId) setSelected((p) => p ? { ...p, status: newStatus } : null);
      toast.success(`Order marked as ${newStatus}`);
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Update failed'); }
    finally { setUpdating(false); }
  };

  const pages = Math.ceil(total / LIMIT);
  const customerName = (o: Order) => o.user?.name ?? o.guestInfo?.name ?? 'Guest';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Orders</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} total orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white dark:bg-arena-800 border border-gray-100 dark:border-arena-700 rounded-xl px-3 py-2 flex-1 min-w-48">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order # or customer…"
            className="bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none flex-1" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="bg-white dark:bg-arena-800 border border-gray-100 dark:border-arena-700 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300 outline-none">
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s.replace(/_/g,' ')}</option>)}
        </select>
      </div>

      {/* Status quick-filter pills */}
      <div className="flex gap-2 flex-wrap">
        {['', 'pending', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'].map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all',
              status === s ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-arena-800 text-gray-600 dark:text-gray-400 hover:text-gray-900')}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0 overflow-x-auto">
        <table className="w-full min-w-[580px]">
          <thead><tr className="border-b border-gray-100 dark:border-arena-700 text-xs text-gray-400 uppercase tracking-wide">
            <th className="text-left px-5 py-3.5">Order</th>
            <th className="text-left px-4 py-3.5 hidden md:table-cell">Customer</th>
            <th className="text-right px-4 py-3.5">Total</th>
            <th className="text-center px-4 py-3.5">Status</th>
            <th className="text-left px-4 py-3.5 hidden lg:table-cell">Date</th>
            <th className="px-4 py-3.5"></th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50 dark:divide-arena-700/50">
            {loading ? Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}><td colSpan={6} className="px-5 py-3"><div className="skeleton h-6 rounded w-full" /></td></tr>
            )) : orders.map((order) => (
              <tr key={order._id} onClick={() => setSelected(order)}
                className="hover:bg-gray-50 dark:hover:bg-arena-800/50 transition-colors cursor-pointer">
                <td className="px-5 py-3.5">
                  <div className="font-mono text-xs font-semibold text-gray-900 dark:text-gray-100">#{order.orderNumber}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</div>
                </td>
                <td className="px-4 py-3.5 hidden md:table-cell">
                  <div className="text-sm text-gray-800 dark:text-gray-200">{customerName(order)}</div>
                  <div className="text-xs text-gray-400">{order.user?.email ?? order.guestInfo?.email ?? 'Guest'}</div>
                </td>
                <td className="px-4 py-3.5 text-right font-semibold text-sm text-gray-900 dark:text-gray-100">{formatCurrency(order.total)}</td>
                <td className="px-4 py-3.5 text-center">
                  <span className={cn('text-xs font-semibold px-2 py-1 rounded-full capitalize', STATUS_COLORS[order.status] ?? STATUS_COLORS.pending)}>
                    {order.status.replace(/_/g,' ')}
                  </span>
                </td>
                <td className="px-4 py-3.5 hidden lg:table-cell text-xs text-gray-400">{new Date(order.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3.5">
                  {NEXT_STATUS[order.status] && (
                    <button onClick={(e) => { e.stopPropagation(); updateStatus(order._id, NEXT_STATUS[order.status]); }}
                      disabled={updating}
                      className="text-xs text-brand-500 hover:text-brand-600 font-semibold whitespace-nowrap capitalize">
                      → {NEXT_STATUS[order.status].replace(/_/g,' ')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && orders.length === 0 && (
              <tr><td colSpan={6} className="py-16 text-center text-gray-400">No orders found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 dark:border-arena-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-arena-800 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
              className="p-2 rounded-lg border border-gray-200 dark:border-arena-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-arena-800 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Order Detail Drawer */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
            <motion.div initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} transition={{ type: 'spring', damping: 30 }}
              className="bg-white dark:bg-arena-800 w-full max-w-sm h-full shadow-2xl flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-arena-700 shrink-0">
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-gray-100">#{selected.orderNumber}</h2>
                  <p className="text-xs text-gray-400">{new Date(selected.createdAt).toLocaleString()}</p>
                </div>
                <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-arena-700 text-gray-400"><X size={18} /></button>
              </div>

              <div className="p-6 space-y-5 flex-1">
                {/* Status badge + advance button */}
                <div className="flex items-center justify-between gap-3">
                  <span className={cn('text-sm font-semibold px-3 py-1 rounded-full capitalize', STATUS_COLORS[selected.status])}>
                    {selected.status.replace(/_/g,' ')}
                  </span>
                  {NEXT_STATUS[selected.status] && (
                    <button onClick={() => updateStatus(selected._id, NEXT_STATUS[selected.status])} disabled={updating}
                      className="btn-primary text-xs py-1.5 px-3 capitalize">
                      Mark as {NEXT_STATUS[selected.status].replace(/_/g,' ')}
                    </button>
                  )}
                </div>

                {/* All status changes */}
                {selected.status !== 'delivered' && selected.status !== 'cancelled' && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Change Status</p>
                    <div className="flex flex-wrap gap-2">
                      {STATUSES.map((s) => (
                        <button key={s} disabled={updating || s === selected.status}
                          onClick={() => updateStatus(selected._id, s)}
                          className={cn('text-xs px-2.5 py-1 rounded-lg capitalize font-medium border transition-all',
                            s === selected.status
                              ? 'bg-brand-500 text-white border-brand-500'
                              : 'border-gray-200 dark:border-arena-600 text-gray-600 dark:text-gray-400 hover:border-brand-400 hover:text-brand-500')}>
                          {s.replace(/_/g,' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Customer */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Customer</p>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{customerName(selected)}</p>
                    {selected.guestInfo?.phone && <p className="flex items-center gap-1.5 text-gray-500"><Phone size={12} />{selected.guestInfo.phone}</p>}
                    {selected.deliveryAddress && <p className="flex items-start gap-1.5 text-gray-500"><MapPin size={12} className="mt-0.5 shrink-0" />{selected.deliveryAddress.street}, {selected.deliveryAddress.city}</p>}
                  </div>
                </div>

                {/* Items */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Items</p>
                  <div className="space-y-2">
                    {selected.items?.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">{item.quantity}× {item.name}</span>
                        <span className="text-gray-500">{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 dark:border-arena-700 mt-3 pt-3 flex justify-between font-bold text-gray-900 dark:text-gray-100">
                    <span>Total</span><span>{formatCurrency(selected.total)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
