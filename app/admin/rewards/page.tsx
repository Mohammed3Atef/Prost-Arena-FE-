'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../../../services/api/client';
import { cn } from '../../../lib/utils';
import toast from 'react-hot-toast';

interface Reward {
  _id: string; name: string; description: string;
  type: 'discount_pct' | 'discount_fixed' | 'free_item' | 'xp_boost' | 'points_grant' | 'free_delivery';
  discountPct: number; discountFixed: number;
  code: string | null; isActive: boolean;
  usageLimit: number | null; usedCount: number;
  minOrderValue: number; expiresAt: string | null;
}

// Must exactly match backend Reward model enum
const REWARD_TYPES = ['discount_pct', 'discount_fixed', 'free_item', 'xp_boost', 'points_grant', 'free_delivery'] as const;
type RewardType = typeof REWARD_TYPES[number];

const TYPE_LABELS: Record<RewardType, string> = {
  discount_pct:   '% Discount',
  discount_fixed: '$ Discount',
  free_item:      'Free Item',
  xp_boost:       'XP Boost',
  points_grant:   'Points Grant',
  free_delivery:  'Free Delivery',
};
const TYPE_ICONS: Record<RewardType, string> = {
  discount_pct:   '🏷️',
  discount_fixed: '💸',
  free_item:      '🎁',
  xp_boost:       '⚡',
  points_grant:   '⭐',
  free_delivery:  '🚚',
};

const EMPTY_FORM = {
  name: '', description: '', type: 'discount_pct' as RewardType,
  discountPct: '0', discountFixed: '0',
  code: '', minOrderValue: '0', usageLimit: '',
  expiresAt: '', isActive: true,
};

export default function AdminRewardsPage() {
  const [rewards,    setRewards]    = useState<Reward[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(false);
  const [editR,      setEditR]      = useState<Reward | null>(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [typeFilter, setTypeFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '100' };
      if (typeFilter) params.type = typeFilter;
      const { data } = await api.get('/rewards', { params });
      setRewards(data.data ?? []);
    } catch { setRewards([]); }
    finally { setLoading(false); }
  }, [typeFilter]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditR(null); setForm(EMPTY_FORM); setModal(true); };

  const openEdit = (r: Reward) => {
    setEditR(r);
    setForm({
      name: r.name, description: r.description ?? '',
      type: r.type as RewardType,
      discountPct:   String(r.discountPct   ?? 0),
      discountFixed: String(r.discountFixed ?? 0),
      code:          r.code ?? '',
      minOrderValue: String(r.minOrderValue ?? 0),
      usageLimit:    r.usageLimit != null ? String(r.usageLimit) : '',
      expiresAt:     r.expiresAt ? r.expiresAt.split('T')[0] : '',
      isActive:      r.isActive,
    });
    setModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name:          form.name,
        description:   form.description,
        type:          form.type,
        minOrderValue: parseFloat(form.minOrderValue) || 0,
        usageLimit:    form.usageLimit ? parseInt(form.usageLimit) : null,
        expiresAt:     form.expiresAt || null,
        code:          form.code || null,
        isActive:      form.isActive,
      };
      // Type-specific fields
      if (form.type === 'discount_pct')   payload.discountPct   = parseFloat(form.discountPct)   || 0;
      if (form.type === 'discount_fixed') payload.discountFixed = parseFloat(form.discountFixed) || 0;

      if (editR) { await api.put(`/rewards/${editR._id}`, payload); toast.success('Reward updated'); }
      else       { await api.post('/rewards', payload); toast.success('Reward created'); }
      setModal(false);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (r: Reward) => {
    try {
      await api.put(`/rewards/${r._id}`, { isActive: !r.isActive });
      setRewards((p) => p.map((x) => x._id === r._id ? { ...x, isActive: !r.isActive } : x));
    } catch { toast.error('Update failed'); }
  };

  const del = async (id: string) => {
    if (!confirm('Deactivate this reward?')) return;
    try {
      await api.put(`/rewards/${id}`, { isActive: false });
      setRewards((p) => p.filter((r) => r._id !== id));
      toast.success('Reward deactivated');
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Rewards</h1>
          <p className="text-sm text-gray-400 mt-0.5">{rewards.length} rewards</p>
        </div>
        <button onClick={openNew} className="btn-primary gap-2 text-sm"><Plus size={16} /> New Reward</button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTypeFilter('')}
          className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
            !typeFilter ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-arena-800 text-gray-600 dark:text-gray-400')}>
          All
        </button>
        {REWARD_TYPES.map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
              typeFilter === t ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-arena-800 text-gray-600 dark:text-gray-400 hover:text-gray-900')}>
            {TYPE_ICONS[t]} {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />) :
          rewards.map((r) => (
            <motion.div key={r._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={cn('card p-5 space-y-3 transition-all', !r.isActive && 'opacity-50')}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{TYPE_ICONS[r.type as RewardType] ?? '🎁'}</span>
                  <div>
                    <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">{r.name}</div>
                    <span className="text-xs text-gray-400">{TYPE_LABELS[r.type as RewardType] ?? r.type}</span>
                  </div>
                </div>
                <button onClick={() => toggleActive(r)}>
                  {r.isActive ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} className="text-gray-400" />}
                </button>
              </div>

              {r.description && <p className="text-xs text-gray-400 leading-relaxed">{r.description}</p>}

              <div className="flex flex-wrap gap-2">
                {r.type === 'discount_pct'   && r.discountPct   > 0 && <span className="text-xs bg-green-50 dark:bg-green-900/20 text-green-600 px-2 py-0.5 rounded-full">{r.discountPct}% off</span>}
                {r.type === 'discount_fixed' && r.discountFixed > 0 && <span className="text-xs bg-green-50 dark:bg-green-900/20 text-green-600 px-2 py-0.5 rounded-full">${r.discountFixed} off</span>}
                {r.code       && <span className="text-xs font-mono bg-brand-50 dark:bg-brand-900/20 text-brand-600 px-2 py-0.5 rounded-full">{r.code}</span>}
                {r.usageLimit && <span className="text-xs text-gray-400">{r.usedCount}/{r.usageLimit} used</span>}
                {r.expiresAt  && <span className="text-xs text-red-400">Exp: {new Date(r.expiresAt).toLocaleDateString()}</span>}
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => openEdit(r)} className="flex-1 btn-secondary py-1.5 text-xs gap-1"><Edit2 size={12} /> Edit</button>
                <button onClick={() => del(r._id)} className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs transition-all"><Trash2 size={12} /></button>
              </div>
            </motion.div>
          ))
        }
        {!loading && rewards.length === 0 && (
          <div className="col-span-full py-16 text-center text-gray-400">
            <p className="text-4xl mb-3">🎁</p><p>No rewards yet</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-arena-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-arena-700 shrink-0">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{editR ? 'Edit Reward' : 'New Reward'}</h2>
                <button onClick={() => setModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-arena-700 text-gray-400"><X size={18} /></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4">
                <div>
                  <label className="field-label">Name *</label>
                  <input className="input" value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. 20% Off Your Next Order" />
                </div>
                <div>
                  <label className="field-label">Description</label>
                  <input className="input" value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Short description…" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">Type</label>
                    <select className="input" value={form.type}
                      onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as RewardType }))}>
                      {REWARD_TYPES.map((t) => (
                        <option key={t} value={t}>{TYPE_ICONS[t]} {TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Coupon Code</label>
                    <input className="input font-mono" value={form.code}
                      onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                      placeholder="SAVE20" />
                  </div>
                </div>

                {/* Discount-specific fields */}
                {form.type === 'discount_pct' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="field-label">Discount %</label>
                      <input type="number" min="0" max="100" className="input" value={form.discountPct}
                        onChange={(e) => setForm((p) => ({ ...p, discountPct: e.target.value }))} />
                    </div>
                    <div>
                      <label className="field-label">Min Order ($)</label>
                      <input type="number" min="0" step="0.01" className="input" value={form.minOrderValue}
                        onChange={(e) => setForm((p) => ({ ...p, minOrderValue: e.target.value }))} />
                    </div>
                  </div>
                )}
                {form.type === 'discount_fixed' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="field-label">Discount Amount ($)</label>
                      <input type="number" min="0" step="0.01" className="input" value={form.discountFixed}
                        onChange={(e) => setForm((p) => ({ ...p, discountFixed: e.target.value }))} />
                    </div>
                    <div>
                      <label className="field-label">Min Order ($)</label>
                      <input type="number" min="0" step="0.01" className="input" value={form.minOrderValue}
                        onChange={(e) => setForm((p) => ({ ...p, minOrderValue: e.target.value }))} />
                    </div>
                  </div>
                )}
                {form.type === 'free_delivery' && (
                  <div>
                    <label className="field-label">Min Order ($)</label>
                    <input type="number" min="0" step="0.01" className="input" value={form.minOrderValue}
                      onChange={(e) => setForm((p) => ({ ...p, minOrderValue: e.target.value }))} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">Usage Limit</label>
                    <input type="number" min="1" className="input" value={form.usageLimit}
                      onChange={(e) => setForm((p) => ({ ...p, usageLimit: e.target.value }))}
                      placeholder="∞ unlimited" />
                  </div>
                  <div>
                    <label className="field-label">Expires On</label>
                    <input type="date" className="input" value={form.expiresAt}
                      onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))} />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isActive}
                    onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded accent-brand-500" />
                  <span className="text-gray-700 dark:text-gray-300">Active (visible to users)</span>
                </label>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
                  <button onClick={save} disabled={saving} className="btn-primary flex-1">
                    {saving ? 'Saving…' : editR ? 'Save Changes' : 'Create Reward'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
