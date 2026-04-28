'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, CheckCircle, XCircle, ChefHat, Truck, Package, MapPin, Phone, Zap } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../../../services/api/client';
import { formatCurrency, cn } from '../../../../lib/utils';
import { useLocale } from '../../../../components/layout/LocaleProvider';

interface OrderItem { name: string; quantity: number; price: number; subtotal: number; }
interface Order {
  _id: string; orderNumber: string; status: string; total: number; subtotal: number;
  deliveryFee: number; discount: number; items: OrderItem[];
  deliveryAddress: { street: string; city: string; notes?: string } | null;
  guestInfo: { name: string; phone: string; email?: string } | null;
  user: { name: string; email: string } | null;
  xpEarned: number; statusHistory: { status: string; note?: string; at: string }[];
  createdAt: string; estimatedDelivery?: string; paymentMethod: string;
}

const STEPS = [
  { key: 'pending',           label: 'Order Placed',    icon: Clock },
  { key: 'confirmed',         label: 'Confirmed',       icon: CheckCircle },
  { key: 'preparing',         label: 'Preparing',       icon: ChefHat },
  { key: 'ready',             label: 'Ready',           icon: Package },
  { key: 'out_for_delivery',  label: 'On the Way',      icon: Truck },
  { key: 'delivered',         label: 'Delivered',       icon: CheckCircle },
];

const STEP_ORDER = STEPS.map((s) => s.key);

export default function OrderDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const { locale } = useLocale();
  const [order,   setOrder]   = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      try {
        const { data } = await api.get(`/orders/${id}`);
        setOrder(data.data);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Order not found');
      } finally { setLoading(false); }
    };
    fetch();
    // Poll every 15s if order is still active
    const interval = setInterval(() => {
      if (!['delivered','cancelled'].includes(order?.status ?? '')) fetch();
    }, 15000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-4">
      {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
    </div>
  );

  if (error || !order) return (
    <div className="max-w-2xl mx-auto card p-12 text-center">
      <XCircle size={40} className="mx-auto text-red-400 mb-3" />
      <p className="font-semibold text-gray-700 dark:text-gray-300">{error || 'Order not found'}</p>
      <Link href="/orders" className="btn-secondary mt-4 inline-flex">Back to Orders</Link>
    </div>
  );

  const currentStep = STEP_ORDER.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';
  const customerName = order.user?.name ?? order.guestInfo?.name ?? 'Guest';

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
        <ArrowLeft size={16} /> Back to orders
      </button>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-display font-bold text-gray-900 dark:text-gray-100">Order #{order.orderNumber}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <div className="text-end">
            <p className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">{formatCurrency(order.total, locale)}</p>
            {order.xpEarned > 0 && (
              <p className="text-sm text-brand-500 font-medium flex items-center gap-1 justify-end mt-0.5">
                <Zap size={13} /> +{order.xpEarned} XP earned
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Progress tracker */}
      {!isCancelled && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-5">Order Status</h2>
          <div className="relative">
            {/* Progress line */}
            <div className="absolute top-5 start-5 end-5 h-0.5 bg-gray-100 dark:bg-arena-700" />
            <div className="absolute top-5 start-5 h-0.5 bg-brand-500 transition-all duration-700"
              style={{ width: `${Math.max(0, currentStep) / (STEPS.length - 1) * 100}%` }} />
            <div className="relative flex justify-between">
              {STEPS.map((step, i) => {
                const Icon     = step.icon;
                const done     = i <= currentStep;
                const active   = i === currentStep;
                return (
                  <div key={step.key} className="flex flex-col items-center gap-2" style={{ minWidth: 0 }}>
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all z-10 bg-white dark:bg-arena-800',
                      done    ? 'border-brand-500 bg-brand-500 text-white' :
                      active  ? 'border-brand-500 text-brand-500' :
                                'border-gray-200 dark:border-arena-600 text-gray-300 dark:text-arena-500')}>
                      <Icon size={16} />
                    </div>
                    <span className={cn('text-xs font-medium text-center leading-tight hidden sm:block',
                      done ? 'text-brand-500' : 'text-gray-400')}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {order.estimatedDelivery && (
            <p className="text-xs text-center text-gray-400 mt-4">
              Estimated delivery: <strong className="text-gray-700 dark:text-gray-300">{new Date(order.estimatedDelivery).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
            </p>
          )}
        </motion.div>
      )}

      {isCancelled && (
        <div className="card p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium flex items-center gap-2">
            <XCircle size={16} /> This order was cancelled
          </p>
        </div>
      )}

      {/* Items */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Items</h2>
        <div className="space-y-3">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-500 text-xs font-bold flex items-center justify-center shrink-0">{item.quantity}</span>
                <span className="text-sm text-gray-800 dark:text-gray-200">{item.name}</span>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">{formatCurrency(item.subtotal, locale)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-arena-700 space-y-2">
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>Subtotal</span><span>{formatCurrency(order.subtotal, locale)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600"><span>Discount</span><span>-{formatCurrency(order.discount, locale)}</span></div>
          )}
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>Delivery</span><span>{formatCurrency(order.deliveryFee, locale)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 dark:text-gray-100 pt-1">
            <span>Total</span><span>{formatCurrency(order.total, locale)}</span>
          </div>
        </div>
      </motion.div>

      {/* Delivery info */}
      {(order.deliveryAddress || order.guestInfo) && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Delivery Details</h2>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2"><span className="font-medium text-gray-800 dark:text-gray-200">{customerName}</span></div>
            {order.guestInfo?.phone && <div className="flex items-center gap-2"><Phone size={13} className="shrink-0" />{order.guestInfo.phone}</div>}
            {order.deliveryAddress && (
              <div className="flex items-start gap-2">
                <MapPin size={13} className="shrink-0 mt-0.5" />
                <span>{order.deliveryAddress.street}, {order.deliveryAddress.city}{order.deliveryAddress.notes && ` — ${order.deliveryAddress.notes}`}</span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Reorder */}
      <Link href="/menu" className="btn-primary w-full text-center block py-3.5">Order Again 🍔</Link>
    </div>
  );
}
