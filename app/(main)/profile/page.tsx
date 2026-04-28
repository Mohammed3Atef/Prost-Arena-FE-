'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Zap, Gift, Copy, Check, LogOut, ShoppingBag, ChevronRight, MapPin, Plus, Edit2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '../../../store/useAuthStore';
import { useRouter } from 'next/navigation';
import XpBar from '../../../components/ui/XpBar';
import api from '../../../services/api/client';
import { formatNumber, xpProgress, formatCurrency, cn } from '../../../lib/utils';
import toast from 'react-hot-toast';
import { useLocale } from '../../../components/layout/LocaleProvider';
import { useSiteSettings } from '../../../components/layout/SiteSettingsProvider';
import { useConfirm } from '../../../components/ui/ConfirmProvider';
import AddressFormModal, { type AddressFormValue } from '../../../components/address/AddressFormModal';
import PasskeyManager from '../../../components/auth/PasskeyManager';

interface UserReward { _id: string; reward: { name: string; type: string; discountPct: number }; status: string; }
interface UserMission { _id: string; title: string; description: string; target: number; type: string; userProgress: { progress: number; status: string }; }
interface RecentOrder { _id: string; orderNumber: string; status: string; total: number; createdAt: string; }
interface Address {
  _id: string; label: string; street: string; building?: string; apt?: string;
  city: string; notes?: string; isDefault: boolean;
}

export default function ProfilePage() {
  const { user, logout, refreshUser, isHydrated } = useAuthStore();
  const router = useRouter();
  const { t, locale } = useLocale();
  const { settings } = useSiteSettings();
  const [rewards,      setRewards]      = useState<UserReward[]>([]);
  const [missions,     setMissions]     = useState<UserMission[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [copied,       setCopied]       = useState(false);
  const [addresses,    setAddresses]    = useState<Address[]>([]);
  const [addrModal,    setAddrModal]    = useState(false);
  const [editingAddr,  setEditingAddr]  = useState<Address | null>(null);
  const [addrSaving,   setAddrSaving]   = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) { router.push('/login'); return; }
    refreshUser();
    api.get('/rewards/mine').then((r) => setRewards((r.data.data ?? []).filter((r: UserReward) => r.status === 'active').slice(0, 3))).catch(() => {});
    api.get('/missions/mine').then((r) => setMissions((r.data.data ?? []).slice(0, 4))).catch(() => {});
    api.get('/orders', { params: { limit: 3 } }).then((r) => setRecentOrders(r.data.data ?? [])).catch(() => {});
    api.get('/users/addresses').then((r) => setAddresses(r.data.data ?? [])).catch(() => {});
  }, [isHydrated]);

  const saveAddress = async (val: AddressFormValue) => {
    setAddrSaving(true);
    try {
      if (val._id) {
        const { data } = await api.patch(`/users/addresses/${val._id}`, val);
        setAddresses(data.data ?? []);
      } else {
        const { data } = await api.post('/users/addresses', val);
        setAddresses(data.data ?? []);
      }
      setAddrModal(false);
      setEditingAddr(null);
      toast.success(t('profile.addressSaved'));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed');
    } finally {
      setAddrSaving(false);
    }
  };

  const deleteAddress = async (id: string) => {
    const ok = await confirm({
      title: t('profile.deleteAddressTitle'),
      description: t('profile.deleteAddressDesc'),
      confirmLabel: t('common.delete'),
      tone: 'danger',
    });
    if (!ok) return;
    try {
      const { data } = await api.delete(`/users/addresses/${id}`);
      setAddresses(data.data ?? []);
      toast.success(t('profile.addressDeleted'));
    } catch { toast.error('Failed'); }
  };

  const setDefaultAddress = async (id: string) => {
    try {
      const { data } = await api.post(`/users/addresses/${id}/default`);
      setAddresses(data.data ?? []);
    } catch { toast.error('Failed'); }
  };

  if (!isHydrated || !user) return null;

  const { level, progress, required, percentage } = xpProgress(user.xp, settings.xpPerLevelCoeff ?? 100);
  const levelTitle = t(`profile.levelTitles.${Math.min(level - 1, 9)}`);

  const copyReferral = () => {
    navigator.clipboard.writeText(user.referralCode);
    setCopied(true);
    toast.success(t('profile.referralCopied'));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Hero card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-arena-gradient p-6 text-white">
        <div className="relative flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-500 flex items-center justify-center text-2xl font-bold text-white shrink-0">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{user.name}</h1>
            <p className="text-brand-300 text-sm">{levelTitle}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm">
              <span className="flex items-center gap-1"><Zap size={14} className="text-yellow-400" />{formatNumber(user.xp)} {t('profile.xpUnit')}</span>
              <span className="flex items-center gap-1"><Star size={14} className="text-yellow-400" />{formatNumber(user.points)} {t('profile.ptsUnit')}</span>
              <span className="flex items-center gap-1"><Trophy size={14} className="text-yellow-400" />{user.challengeWins ?? 0} {t('profile.winsUnit')}</span>
            </div>
          </div>
          <button onClick={() => { logout(); router.push('/'); }}
            className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors">
            <LogOut size={16} />
          </button>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{t('profile.level', { level })}</span>
            <span>{progress.toLocaleString()} / {required.toLocaleString()} {t('profile.xpUnit')}</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-yellow-500" />
          </div>
        </div>
      </motion.div>

      {/* Referral */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <Gift size={18} className="text-brand-500" /> {t('profile.referralCode')}
        </h2>
        <div className="flex items-center gap-3">
          <code className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-arena-700 rounded-xl font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
            {user.referralCode}
          </code>
          <button onClick={copyReferral} className="btn-primary py-2.5 px-4 flex items-center gap-2">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? t('profile.copied') : t('profile.copy')}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('profile.referralHint')}</p>
      </motion.div>

      {/* Recent Orders */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ShoppingBag size={18} className="text-brand-500" /> {t('profile.recentOrders')}
          </h2>
          <Link href="/orders" className="text-xs text-brand-500 hover:text-brand-600 font-semibold flex items-center gap-1">
            {t('profile.viewAll')} <ChevronRight size={13} />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">{t('profile.noOrdersYet')} <Link href="/menu" className="text-brand-500 hover:underline">{t('profile.browseTheMenu')}</Link></p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-arena-700">
            {recentOrders.map((o) => (
              <Link key={o._id} href={`/orders/${o._id}`}
                className="flex items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-arena-700 -mx-2 px-2 rounded-xl transition-colors">
                <div>
                  <span className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">#{o.orderNumber}</span>
                  <span className={`ms-2 text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                    o.status === 'delivered' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                    o.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-500' :
                    'bg-brand-100 dark:bg-brand-900/30 text-brand-600'}`}>
                    {o.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(o.total, locale)}</span>
              </Link>
            ))}
          </div>
        )}
      </motion.div>

      {/* Addresses */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <MapPin size={18} className="text-brand-500" /> {t('profile.myAddresses')}
          </h2>
          <button
            onClick={() => { setEditingAddr(null); setAddrModal(true); }}
            className="text-xs text-brand-500 hover:text-brand-600 font-semibold flex items-center gap-1"
          >
            <Plus size={13} /> {t('profile.addAddress')}
          </button>
        </div>
        {addresses.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">{t('profile.noAddresses')}</p>
        ) : (
          <div className="space-y-2">
            {addresses.map((a) => (
              <div key={a._id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-arena-700/50 border border-gray-100 dark:border-arena-700">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{a.label}</span>
                    {a.isDefault && (
                      <span className="text-[10px] uppercase font-bold tracking-wide bg-brand-500 text-white px-1.5 py-0.5 rounded">{t('profile.default')}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 truncate">{a.street}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {[a.building, a.apt, a.city].filter(Boolean).join(' · ')}
                  </p>
                  {a.notes && <p className="text-xs text-gray-400 italic mt-0.5">&quot;{a.notes}&quot;</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!a.isDefault && (
                    <button
                      onClick={() => setDefaultAddress(a._id)}
                      title={t('profile.setDefault')}
                      className="text-[10px] text-brand-500 hover:underline whitespace-nowrap"
                    >
                      {t('profile.setDefault')}
                    </button>
                  )}
                  <button
                    onClick={() => { setEditingAddr(a); setAddrModal(true); }}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-arena-600 rounded-lg"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => deleteAddress(a._id)}
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <AddressFormModal
        open={addrModal}
        onClose={() => { setAddrModal(false); setEditingAddr(null); }}
        onSubmit={saveAddress}
        initial={editingAddr}
        saving={addrSaving}
      />

      {/* Security / passkeys */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19 }}>
        <PasskeyManager />
      </motion.div>

      {/* Active missions */}
      {missions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            {t('profile.activeMissions')}
          </h2>
          <div className="space-y-3">
            {missions.map((m) => {
              const pct = Math.min(100, Math.round(((m.userProgress?.progress ?? 0) / m.target) * 100));
              return (
                <div key={m._id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{m.title}</span>
                    <span className="text-gray-500">{m.userProgress?.progress ?? 0}/{m.target}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-arena-700 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Active rewards */}
      {rewards.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Gift size={18} className="text-brand-500" /> {t('profile.myRewards')}
          </h2>
          <div className="space-y-2">
            {rewards.map((ur) => (
              <div key={ur._id} className="flex items-center justify-between p-3 rounded-xl bg-brand-50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-800">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{ur.reward.name}</p>
                  <p className="text-xs text-gray-500">{ur.reward.type === 'discount_pct' ? `${ur.reward.discountPct}% ${t('cart.discount').toLowerCase()}` : t('profile.specialReward')}</p>
                </div>
                <span className="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">{t('profile.active')}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
