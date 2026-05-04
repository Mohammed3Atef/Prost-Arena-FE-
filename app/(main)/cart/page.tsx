'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, Minus, ShoppingBag, Tag, Gift, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { useCart } from '../../../hooks/useCart';
import { useAuthStore } from '../../../store/useAuthStore';
import AddressFormModal, { type AddressFormValue } from '../../../components/address/AddressFormModal';
import Modal from '../../../components/ui/Modal';
import { formatCurrency } from '../../../lib/utils';
import api from '../../../services/api/client';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { useConfirm } from '../../../components/ui/ConfirmProvider';
import { useLocale } from '../../../components/layout/LocaleProvider';
import { useSiteSettings } from '../../../components/layout/SiteSettingsProvider';

interface UserReward {
  _id: string;
  reward: { _id: string; name: string; type: string; discountPct?: number; discountFixed?: number };
}

interface SavedAddress {
  _id: string; label: string; street: string; building?: string; apt?: string;
  city: string; notes?: string; isDefault: boolean;
}

function rewardLabel(ur: UserReward, t: (k: string, v?: Record<string, string | number>) => string) {
  const { reward } = ur;
  if (reward.type === 'discount_pct')   return t('cart.percentOff', { pct: reward.discountPct ?? 0 });
  if (reward.type === 'discount_fixed') return t('cart.fixedOff',   { amount: `$${(reward.discountFixed ?? 0).toFixed(2)}` });
  if (reward.type === 'free_delivery')  return t('cart.freeDelivery');
  return reward.name;
}

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    cart, isReady,
    setQuantity, removeItem, clearCart,
    applyCoupon: applyCouponApi, applyReward, removeCoupon,
    subtotal, total, itemCount,
  } = useCart();
  const items        = cart.items;
  const coupon       = cart.couponCode;
  const userRewardId = cart.userRewardId;
  const discount     = cart.discount;

  const [couponInput,    setCouponInput]    = useState('');
  const [couponLoading,  setCouponLoading]  = useState(false);
  const [myRewards,      setMyRewards]      = useState<UserReward[]>([]);
  const [rewardsOpen,    setRewardsOpen]    = useState(false);
  const [placing,        setPlacing]        = useState(false);
  const [addresses,      setAddresses]      = useState<SavedAddress[]>([]);
  const [selectedAddrId, setSelectedAddrId] = useState<string | null>(null);
  const [addrPickerOpen, setAddrPickerOpen] = useState(false);
  const [addrModal,      setAddrModal]      = useState(false);
  const [addrSaving,     setAddrSaving]     = useState(false);
  const confirm = useConfirm();
  const { t, locale } = useLocale();
  const { settings } = useSiteSettings();

  const handleClearCart = async () => {
    const ok = await confirm({
      title: t('cart.clearCartTitle'),
      description: t('cart.clearCartDesc'),
      confirmLabel: t('cart.clear'),
      tone: 'warning',
    });
    if (ok) clearCart();
  };

  const sub   = subtotal();

  useEffect(() => {
    if (!user) return;
    api.get('/rewards/mine').then((r) => setMyRewards(r.data.data ?? [])).catch(() => {});
    api.get('/users/addresses').then((r) => {
      const list: SavedAddress[] = r.data.data ?? [];
      setAddresses(list);
      const def = list.find((a) => a.isDefault) ?? list[0];
      if (def) setSelectedAddrId(def._id);
    }).catch(() => {});
  }, [user]);

  const selectedAddress = addresses.find((a) => a._id === selectedAddrId) ?? null;

  // Per-city delivery fee with fallback to the global default. If the selected
  // address's city matches an admin-defined active city, use its fee; otherwise
  // use the global default fee from settings.
  const cityMatch = selectedAddress
    ? (settings.deliveryCities ?? []).find(
        (c: any) => c.name?.trim().toLowerCase() === selectedAddress.city.trim().toLowerCase(),
      )
    : null;
  const DELIVERY_FEE = cityMatch ? Number(cityMatch.fee) || 0 : (settings.deliveryFee ?? 15);
  const tot = total(DELIVERY_FEE);

  const handleSaveAddress = async (val: AddressFormValue) => {
    setAddrSaving(true);
    try {
      const { data } = await api.post('/users/addresses', val);
      const next: SavedAddress[] = data.data ?? [];
      setAddresses(next);
      const just = next[next.length - 1];
      if (just) setSelectedAddrId(just._id);
      setAddrModal(false);
      toast.success(t('profile.addressSaved'));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed');
    } finally {
      setAddrSaving(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      await applyCouponApi(couponInput.trim().toUpperCase());
      toast.success(t('cart.discountApplied', { amount: formatCurrency(cart.discount, locale) }));
      setCouponInput('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('cart.invalidCoupon'));
    } finally {
      setCouponLoading(false);
    }
  };

  const handleApplyReward = async (rewardId: string) => {
    setCouponLoading(true);
    try {
      await applyReward(rewardId);
      setRewardsOpen(false);
      toast.success(t('cart.rewardApplied', { amount: formatCurrency(cart.discount, locale) }));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('cart.rewardUnavailable'));
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!user) { router.push('/login'); return; }
    if (items.length === 0) return;
    if (!selectedAddress) {
      toast.error(t('cart.needAddress'));
      return;
    }
    setPlacing(true);
    try {
      const payload: any = {
        items: items.map((i) => ({
          menuItem: i.menuItem, quantity: i.quantity,
          price: i.price, specialNote: i.specialNote,
        })),
        deliveryFee: DELIVERY_FEE, total: tot,
        type: 'delivery',
        deliveryAddress: {
          street: [selectedAddress.street, selectedAddress.building, selectedAddress.apt].filter(Boolean).join(', '),
          city:   selectedAddress.city,
        },
      };
      if (coupon)       payload.couponCode   = coupon;
      if (userRewardId) payload.userRewardId = userRewardId;
      const { data } = await api.post('/orders', payload);
      await clearCart();
      toast.success(t('cart.orderPlaced'));
      router.push(`/orders/${data.data._id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('cart.orderFailed'));
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-24 space-y-4">
        <p className="text-6xl">🛒</p>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('cart.empty')}</h2>
        <p className="text-gray-500 dark:text-gray-400">{t('cart.emptySub')}</p>
        <button onClick={() => router.push('/menu')} className="btn-primary px-8 py-3 mt-2">{t('cart.browseMenu')}</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title">{t('cart.title')} <span className="badge-brand ms-2">{itemCount()}</span></h1>
        <button onClick={handleClearCart} className="text-sm text-red-400 hover:text-red-600 transition-colors">
          {t('cart.clearCart')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div key={item.lineId} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
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
                        <button onClick={() => setQuantity(item.lineId, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-arena-600 transition-colors">
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                        <button onClick={() => setQuantity(item.lineId, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-arena-600 transition-colors">
                          <Plus size={14} />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(item.price * item.quantity, locale)}</span>
                        <button onClick={() => removeItem(item.lineId)} className="text-red-400 hover:text-red-600 transition-colors p-1">
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
          {/* Delivery address */}
          <div className="card p-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <MapPin size={16} className="text-brand-500" /> {t('cart.deliveryAddress')}
            </p>
            {selectedAddress ? (
              <div className="space-y-2">
                <div className="text-sm">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    {selectedAddress.label}
                    {selectedAddress.isDefault && (
                      <span className="text-[10px] uppercase font-bold bg-brand-500 text-white px-1.5 py-0.5 rounded">{t('profile.default')}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">{selectedAddress.street}</p>
                  <p className="text-xs text-gray-500">
                    {[selectedAddress.building, selectedAddress.apt, selectedAddress.city].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex gap-3 text-xs">
                  {addresses.length > 1 && (
                    <button onClick={() => setAddrPickerOpen(true)} className="text-brand-500 hover:underline font-semibold">
                      {t('cart.changeAddress')}
                    </button>
                  )}
                  <button onClick={() => setAddrModal(true)} className="text-brand-500 hover:underline font-semibold">
                    + {t('profile.addAddress')}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddrModal(true)} className="btn-secondary w-full text-sm justify-center">
                <MapPin size={14} /> {t('cart.addAddress')}
              </button>
            )}
          </div>

          {/* Rewards */}
          {user && myRewards.length > 0 && (
            <div className="card p-4">
              <button onClick={() => setRewardsOpen(!rewardsOpen)}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-gray-100">
                <span className="flex items-center gap-2"><Gift size={16} className="text-brand-500" />
                  {t(myRewards.length > 1 ? 'cart.rewardsAvailablePlural' : 'cart.rewardsAvailable', { count: myRewards.length })}
                </span>
                {rewardsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {rewardsOpen && (
                <div className="mt-3 space-y-2">
                  {myRewards.map((ur) => (
                    <button key={ur._id} onClick={() => userRewardId === ur._id ? removeCoupon() : handleApplyReward(ur._id)}
                      className={`w-full text-start p-3 rounded-xl border text-sm transition-all ${userRewardId === ur._id ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-arena-600 hover:border-brand-300'}`}>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{ur.reward.name}</p>
                      <p className="text-xs text-gray-500">{rewardLabel(ur, t)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Coupon — also shows the "applied" state when a UserReward (clicked
              from the Rewards section above) is the source of the discount, so
              the user can see what's currently applied either way. */}
          <div className="card p-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Tag size={16} className="text-brand-500" /> {t('cart.couponCode')}
            </p>
            {(() => {
              const appliedReward = userRewardId
                ? myRewards.find((ur) => ur._id === userRewardId)?.reward
                : null;
              const appliedLabel = coupon
                ?? (appliedReward as any)?.code
                ?? appliedReward?.name
                ?? null;

              if (appliedLabel) {
                return (
                  <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-green-700 dark:text-green-400 truncate">{appliedLabel}</p>
                      <p className="text-xs text-green-600 dark:text-green-500">
                        {coupon ? '' : '🎁 '}-{t('cart.saved', { amount: formatCurrency(discount, locale) })}
                      </p>
                    </div>
                    <button onClick={removeCoupon} className="text-red-400 hover:text-red-600 text-xs font-semibold shrink-0 ms-3">
                      {t('cart.remove')}
                    </button>
                  </div>
                );
              }

              return (
                <div className="flex gap-2">
                  <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder={t('cart.enterCode')} className="input flex-1 font-mono uppercase" />
                  <button onClick={handleApplyCoupon} disabled={couponLoading || !couponInput.trim()} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
                    {couponLoading ? '…' : t('cart.apply')}
                  </button>
                </div>
              );
            })()}
          </div>

          {/* Summary */}
          <div className="card p-4 space-y-3">
            <p className="font-semibold text-gray-900 dark:text-gray-100">{t('cart.summary')}</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>{t('cart.subtotal')}</span><span>{formatCurrency(sub, locale)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>{t('cart.delivery')}</span><span>{formatCurrency(DELIVERY_FEE, locale)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
                  <span>{t('cart.discount')}</span><span>-{formatCurrency(discount, locale)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-arena-700">
                <span>{t('cart.totalLabel')}</span><span className="text-brand-500">{formatCurrency(tot, locale)}</span>
              </div>
            </div>
            <button onClick={handlePlaceOrder} disabled={placing}
              className="btn-primary w-full py-4 text-base mt-2 disabled:opacity-50 flex items-center justify-center gap-2">
              {placing ? t('cart.placingOrder') : <><ShoppingBag size={18} />{t('cart.placeOrder')} · {formatCurrency(tot, locale)}</>}
            </button>
          </div>
        </div>
      </div>

      {/* Address picker — list of saved addresses */}
      <Modal
        open={addrPickerOpen}
        onOpenChange={(o) => !o && setAddrPickerOpen(false)}
        title={t('cart.selectAddress')}
        size="md"
      >
        <div className="space-y-2">
          {addresses.map((a) => (
            <button
              key={a._id}
              onClick={() => { setSelectedAddrId(a._id); setAddrPickerOpen(false); }}
              className={`w-full text-start p-3 rounded-xl border transition-all ${
                selectedAddrId === a._id
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-gray-200 dark:border-arena-600 hover:border-brand-300'
              }`}
            >
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{a.label}</p>
              <p className="text-xs text-gray-600 dark:text-gray-300">{a.street}</p>
              <p className="text-xs text-gray-500">{[a.building, a.apt, a.city].filter(Boolean).join(' · ')}</p>
            </button>
          ))}
        </div>
      </Modal>

      {/* New address form */}
      <AddressFormModal
        open={addrModal}
        onClose={() => setAddrModal(false)}
        onSubmit={handleSaveAddress}
        saving={addrSaving}
      />
    </div>
  );
}
