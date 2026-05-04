'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Phone, Mail, MapPin, Package, Ticket, CreditCard,
  Truck, Clock, Zap, Star, User as UserIcon, RefreshCw,
} from 'lucide-react';
import api from '../../../../services/api/client';
import { cn, formatCurrency } from '../../../../lib/utils';
import toast from 'react-hot-toast';

interface OrderItem {
  menuItem: { _id: string; image: string | null } | string | null;
  name: string;
  price: number;
  quantity: number;
  addOns: { name: string; price: number }[];
  specialNote: string;
  subtotal: number;
}

interface StatusEntry { status: string; note?: string; timestamp: string; }

interface CouponReward {
  _id: string; name: string; code: string | null; type: string;
  discountPct: number; discountFixed: number; source: string;
}

interface OrderDetail {
  _id: string; orderNumber: string; status: string;
  type: 'dine-in' | 'takeaway' | 'delivery';
  user: { _id: string; name: string; email: string; phone?: string; level: number; avatar?: string } | null;
  guestInfo: { name?: string; email?: string; phone?: string } | null;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  couponCode: string | null;
  couponReward: CouponReward | null;
  pointsUsed: number;
  deliveryAddress: { street?: string; city?: string; zip?: string } | null;
  paymentMethod: 'cash' | 'card' | 'points' | 'mixed';
  paymentStatus: string;
  notes: string | null;
  statusHistory: StatusEntry[];
  xpAwarded: number;
  pointsAwarded: number;
  createdAt: string;
  updatedAt: string;
}

const STATUSES = [
  'pending', 'confirmed', 'preparing', 'ready',
  'out_for_delivery', 'delivered', 'cancelled',
] as const;

const STATUS_COLORS: Record<string, string> = {
  pending:          'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  confirmed:        'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  preparing:        'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400',
  ready:            'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  out_for_delivery: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
  delivered:        'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  cancelled:        'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

function formatStatus(s: string) {
  return s.replace(/_/g, ' ');
}

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data.data ?? data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load order');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (newStatus: string) => {
    if (!order) return;
    setUpdating(true);
    try {
      await api.patch(`/orders/${order._id}/status`, { status: newStatus });
      toast.success(`Marked as ${formatStatus(newStatus)}`);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <OrderSkeleton />;
  if (!order) return (
    <div className="card p-12 text-center">
      <p className="text-gray-400 mb-3">Order not found.</p>
      <Link href="/admin/orders" className="btn-ghost text-sm inline-flex items-center gap-1">
        <ArrowLeft size={14} /> Back to orders
      </Link>
    </div>
  );

  const customerName = order.user?.name || order.guestInfo?.name || 'Guest';
  const customerEmail = order.user?.email || order.guestInfo?.email;
  const customerPhone = order.user?.phone || order.guestInfo?.phone;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <Link
          href="/admin/orders"
          className="text-xs text-gray-400 hover:text-brand-500 inline-flex items-center gap-1"
        >
          <ArrowLeft size={12} /> Back to orders
        </Link>
        <div className="flex items-center justify-between gap-3 flex-wrap mt-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-900 dark:text-gray-100">
              Order #{order.orderNumber}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Placed {new Date(order.createdAt).toLocaleString('en', {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
              {' · '}
              <span className="capitalize">{order.type.replace('-', ' ')}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-sm font-semibold px-3 py-1.5 rounded-full capitalize',
              STATUS_COLORS[order.status] || STATUS_COLORS.pending,
            )}>
              {formatStatus(order.status)}
            </span>
            <button
              onClick={load}
              className="btn-ghost p-2"
              title="Refresh"
            >
              <RefreshCw size={15} className={cn(loading && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      {/* Status update bar */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Update status
        </p>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              disabled={updating || s === order.status}
              onClick={() => updateStatus(s)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-lg capitalize font-medium border transition-all',
                s === order.status
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'border-gray-200 dark:border-arena-600 text-gray-600 dark:text-gray-400 hover:border-brand-400 hover:text-brand-500',
              )}
            >
              {formatStatus(s)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — items + totals (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Package size={16} /> Items ({order.items.length})
            </h2>
            <div className="space-y-3">
              {order.items.map((item, i) => {
                const image = typeof item.menuItem === 'object' && item.menuItem?.image;
                return (
                  <div key={i} className="flex items-start gap-3 pb-3 border-b border-gray-50 dark:border-arena-700/50 last:border-0 last:pb-0">
                    <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-arena-700 overflow-hidden shrink-0 flex items-center justify-center">
                      {image
                        ? <img src={image} alt={item.name} className="w-full h-full object-cover" />
                        : <Package size={20} className="text-gray-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {item.quantity}× {item.name}
                      </p>
                      <p className="text-xs text-gray-500">{formatCurrency(item.price)} each</p>
                      {item.addOns?.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          + {item.addOns.map((a) => a.name).join(', ')}
                        </p>
                      )}
                      {item.specialNote && (
                        <p className="text-xs italic text-gray-400 mt-1">"{item.specialNote}"</p>
                      )}
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 shrink-0">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totals */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Totals</h2>
            <div className="space-y-2 text-sm">
              <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
              {order.discount > 0 && (
                <Row
                  label={`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`}
                  value={`−${formatCurrency(order.discount)}`}
                  accent="text-green-500"
                />
              )}
              {order.pointsUsed > 0 && (
                <Row label={`Points used`} value={`−${order.pointsUsed} pts`} accent="text-purple-500" />
              )}
              {order.deliveryFee > 0 && (
                <Row label="Delivery" value={formatCurrency(order.deliveryFee)} />
              )}
              <div className="border-t border-gray-100 dark:border-arena-700 pt-2 mt-2">
                <Row
                  label={<strong>Total</strong>}
                  value={<strong className="text-lg">{formatCurrency(order.total)}</strong>}
                />
              </div>
            </div>
          </div>

          {/* Coupon detail card */}
          {order.couponReward && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Ticket size={16} /> Coupon applied
              </h2>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-gray-900 dark:text-gray-100">{order.couponReward.name}</p>
                {order.couponReward.code && (
                  <p>
                    <span className="font-mono text-xs px-2 py-1 rounded bg-gray-100 dark:bg-arena-700">
                      {order.couponReward.code}
                    </span>
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Type: <span className="capitalize">{order.couponReward.type.replace(/_/g, ' ')}</span>
                  {order.couponReward.discountPct > 0 && ` · ${order.couponReward.discountPct}% off`}
                  {order.couponReward.discountFixed > 0 && ` · ${formatCurrency(order.couponReward.discountFixed)} off`}
                </p>
                <p className="text-xs text-gray-500">
                  Source: <span className="capitalize">{order.couponReward.source.replace(/_/g, ' ')}</span>
                </p>
              </div>
            </div>
          )}

          {/* XP / Points awarded */}
          {(order.xpAwarded > 0 || order.pointsAwarded > 0) && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Earned from this order</h2>
              <div className="flex gap-6">
                {order.xpAwarded > 0 && (
                  <div className="flex items-center gap-2">
                    <Zap size={18} className="text-brand-500" />
                    <div>
                      <p className="text-lg font-bold text-brand-500">+{order.xpAwarded}</p>
                      <p className="text-xs text-gray-500">XP</p>
                    </div>
                  </div>
                )}
                {order.pointsAwarded > 0 && (
                  <div className="flex items-center gap-2">
                    <Star size={18} className="text-gold-500" />
                    <div>
                      <p className="text-lg font-bold text-gold-500">+{order.pointsAwarded}</p>
                      <p className="text-xs text-gray-500">points</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — sidebar info */}
        <div className="space-y-6">
          {/* Customer */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <UserIcon size={16} /> Customer
            </h2>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-gray-900 dark:text-gray-100">{customerName}</p>
              {customerEmail && (
                <p className="flex items-center gap-2 text-gray-500">
                  <Mail size={12} className="shrink-0" />
                  <span className="truncate">{customerEmail}</span>
                </p>
              )}
              {customerPhone && (
                <p className="flex items-center gap-2 text-gray-500">
                  <Phone size={12} className="shrink-0" />
                  {customerPhone}
                </p>
              )}
              {order.user && (
                <p className="text-xs text-gray-500">Level {order.user.level}</p>
              )}
              {!order.user && (
                <span className="inline-block text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-arena-700 text-gray-500">
                  Guest order
                </span>
              )}
            </div>
          </div>

          {/* Delivery address */}
          {order.deliveryAddress && order.deliveryAddress.street && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <MapPin size={16} /> Delivery
              </h2>
              <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <p>{order.deliveryAddress.street}</p>
                <p className="text-gray-500">
                  {order.deliveryAddress.city}
                  {order.deliveryAddress.zip ? ` · ${order.deliveryAddress.zip}` : ''}
                </p>
              </div>
            </div>
          )}

          {/* Payment */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <CreditCard size={16} /> Payment
            </h2>
            <div className="space-y-2 text-sm">
              <Row label="Method" value={<span className="capitalize">{order.paymentMethod}</span>} />
              <Row
                label="Status"
                value={
                  <span className={cn(
                    'text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
                    order.paymentStatus === 'paid'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-arena-700 text-gray-500',
                  )}>
                    {order.paymentStatus}
                  </span>
                }
              />
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Notes</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 italic">"{order.notes}"</p>
            </div>
          )}

          {/* Status history */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Clock size={16} /> Status history
            </h2>
            {order.statusHistory.length === 0 ? (
              <p className="text-sm text-gray-400">No status changes yet.</p>
            ) : (
              <div className="space-y-3">
                {[...order.statusHistory].reverse().map((entry, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <div className={cn(
                      'w-2 h-2 rounded-full mt-1.5 shrink-0',
                      i === 0 ? 'bg-brand-500' : 'bg-gray-300 dark:bg-arena-600',
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                        {formatStatus(entry.status)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(entry.timestamp).toLocaleString('en', {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      {entry.note && <p className="text-xs text-gray-400 italic mt-0.5">{entry.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: React.ReactNode; value: React.ReactNode; accent?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={cn('font-medium text-gray-900 dark:text-gray-100', accent)}>{value}</span>
    </div>
  );
}

function OrderSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="h-12 bg-gray-100 dark:bg-arena-800 rounded animate-pulse" />
      <div className="h-16 rounded-2xl bg-gray-100 dark:bg-arena-800 animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-64 rounded-2xl bg-gray-100 dark:bg-arena-800 animate-pulse" />
          <div className="h-40 rounded-2xl bg-gray-100 dark:bg-arena-800 animate-pulse" />
        </div>
        <div className="space-y-6">
          <div className="h-32 rounded-2xl bg-gray-100 dark:bg-arena-800 animate-pulse" />
          <div className="h-32 rounded-2xl bg-gray-100 dark:bg-arena-800 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
