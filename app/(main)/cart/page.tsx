'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, Minus, ShoppingBag, Tag, Gift, ChevronDown, ChevronUp } from 'lucide-react';
import { useCartStore } from '../../../store/useCartStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { formatCurrency } from '../../../lib/utils';
import api from '../../../services/api/client';
import toast from 'react-hot-toast';
import Image from 'next/image';

const DELIVERY_FEE = 15;

interface UserReward {
  _id: string;
  reward: { _id: string; name: string; type: string; discountPct?: number; discountFixed?: number };
}

function rewardLabel(ur: UserReward) {
  const { reward } = ur;
  if (reward.type === 'discount_pct')   return `${reward.discountPct}% off`;
  if (reward.type === 'discount_fixed') return `$${reward.discountFixed?.toFixed(2)} off`;
  if (reward.type === 'free_delivery')  return 'Free delivery';
  return reward.name;
}

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    items, coupon, userRewardId, discount,
    removeItem, updateQty, clearCart,
    applyCoupon, applyUserReward, removeCoupon,
    subtotal, total, itemCount,
  } = useCartStore();

  const [couponInput,    setCouponInput]    = useState('');
  const [couponLoading,  setCouponLoading]  = useState(false);
  const [myRewards,      setMyRewards]      = useState<UserReward[]>([]);
  const [rewardsOpen,    setRewardsOpen]    = useState(false);
  const [placing,        setPlacing]        = useState(false);

  const sub   = subtotal();
  const tot   = total(DELIVERY_FEE);

  useEffect(() => {
    if (!user) return;
    api.get('/rewards/mine').then((r) => setMyRewards(r.data.data ?? [])).catch(() => {});
  }, [user]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      const { data } = await api.post('/orders/validate-coupon', {
        code: couponInput.trim().toUpperCase(), orderTotal: sub, deliveryFee: DELIVERY_FEE,
      });
      applyCoupon(couponInput.trim().toUpperCase(), data.data.discountAmount);
      toast.success(`${formatCurrency(data.data.discountAmount)} discount applied!`);
      setCouponInput('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Invalid coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleApplyReward = async (rewardId: string) => {
    setCouponLoading(true);
    try {
      const { data } = await api.post('/orders/validate-coupon', {
        userRewardId: rewardId, orderTotal: sub, deliveryFee: DELIVERY_FEE,
      });
      applyUserReward(rewardId, data.data.discountAmount);
      setRewardsOpen(false);
      toast.success(`Reward applied! -${formatCurrency(data.data.discountAmount)}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Reward unavailable');
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!user) { router.push('/login'); return; }
    if (items.length === 0) return;
    setPlacing(true);
    try {
      const payload: any = {
        items: items.map((i) => ({
          menuItem: i.menuItemId, quantity: i.quantity,
          price: i.price, specialNote: i.specialNote,
        })),
        deliveryFee: DELIVERY_FEE, total: tot,
      };
      if (coupon)       payload.couponCode   = coupon;
      if (userRewardId) payload.userRewardId = userRewardId;
      const { data } = await api.post('/orders', payload);
      clearCart();
      toast.success('Order placed! 🎉');
      router.push(`/orders/${data.data._id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-24 space-y-4">
        <p className="text-6xl">🛒</p>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your cart is empty</h2>
        <p className="text-gray-500 dark:text-gray-400">Add some items from the menu to get started!</p>
        <button onClick={() => router.push('/menu')} className="btn-primary px-8 py-3 mt-2">Browse Menu</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title">Your Cart <span className="badge-brand ml-2">{itemCount()}</span></h1>
        <button onClick={() => { if (confirm('Clear all items?')) clearCart(); }} className="text-sm text-red-400 hover:text-red-600 transition-colors">
          Clear cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div key={item.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} className="card p-4">
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-arena-700 shrink-0">
                    {item.image
                      ? <Image src={item.image} alt={item.name} width={80} height={80} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{item.name}</p>
                    {item.addOns.length > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">+ {item.addOns.map((a) => a.name).join(', ')}</p>
                    )}
                    {item.specialNote && (
                      <p className="text-xs text-gray-400 italic mt-0.5">&quot;{item.specialNote}&quot;</p>
                    )}
                    <div className="flex items-center justify-between mt-3 gap-2">
                      <div className="flex items-center gap-2 bg-gray-100 dark:bg-arena-700 rounded-xl p-1">
                        <button onClick={() => updateQty(item.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-arena-600 transition-colors">
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-arena-600 transition-colors">
                          <Plus size={14} />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(item.subtotal)}</span>
                        <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Order summary */}
        <div className="space-y-4">
          {/* Rewards */}
          {user && myRewards.length > 0 && (
            <div className="card p-4">
              <button onClick={() => setRewardsOpen(!rewardsOpen)}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-gray-100">
                <span className="flex items-center gap-2"><Gift size={16} className="text-brand-500" />{myRewards.length} Reward{myRewards.length > 1 ? 's' : ''} Available</span>
                {rewardsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {rewardsOpen && (
                <div className="mt-3 space-y-2">
                  {myRewards.map((ur) => (
                    <button key={ur._id} onClick={() => userRewardId === ur._id ? removeCoupon() : handleApplyReward(ur._id)}
                      className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${userRewardId === ur._id ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-arena-600 hover:border-brand-300'}`}>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{ur.reward.name}</p>
                      <p className="text-xs text-gray-500">{rewardLabel(ur)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Coupon */}
          <div className="card p-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Tag size={16} className="text-brand-500" /> Coupon Code
            </p>
            {coupon ? (
              <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl px-4 py-3">
                <div>
                  <p className="font-mono font-bold text-green-700 dark:text-green-400">{coupon}</p>
                  <p className="text-xs text-green-600 dark:text-green-500">-{formatCurrency(discount)} saved</p>
                </div>
                <button onClick={removeCoupon} className="text-red-400 hover:text-red-600 text-xs font-semibold">Remove</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Enter code" className="input flex-1 font-mono uppercase" />
                <button onClick={handleApplyCoupon} disabled={couponLoading || !couponInput.trim()} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
                  {couponLoading ? '…' : 'Apply'}
                </button>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="card p-4 space-y-3">
            <p className="font-semibold text-gray-900 dark:text-gray-100">Order Summary</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal</span><span>{formatCurrency(sub)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Delivery</span><span>{formatCurrency(DELIVERY_FEE)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
                  <span>Discount</span><span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-arena-700">
                <span>Total</span><span className="text-brand-500">{formatCurrency(tot)}</span>
              </div>
            </div>
            <button onClick={handlePlaceOrder} disabled={placing}
              className="btn-primary w-full py-4 text-base mt-2 disabled:opacity-50 flex items-center justify-center gap-2">
              {placing ? 'Placing order…' : <><ShoppingBag size={18} />Place Order · {formatCurrency(tot)}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
