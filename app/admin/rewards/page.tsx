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

  const openNew  = () => { setEditR(null); setForm(EMPTY_FORM); setModal(true); };
  const openEdit = (r: Reward) => {
    setEditR(r);
    setForm({
      name: r.name, description: r.description ?? '', type: r.type,
      discountPct:   String(r.discountPct   ?? 0),
      discountFixed: String(r.discountFixed ?? 0),
      code:          r.code ?? '',
      minOrderValue: String(r.minOrderValue ?? 0),
      usageLimit:    r.usageLimit != null ? String(r.usageLimit) : '',
      expiresAt:     r.expiresAt ? r.expiresAt.slice(0, 10) : '',
      isActive:      r.isActive,
    });
    setModal(true);
  };

  const closeModal = () => { setModal(false); setEditR(null); };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name:          form.name.trim(),
        description:   form.description.trim(),
        type:          form.type,
        discountPct:   parseFloat(form.discountPct)   || 0,
        discountFixed: parseFloat(form.discountFixed) || 0,
        code:          form.code.trim() || null,
        minOrderValue: parseFloat(form.minOrderValue) || 0,
        usageLimit:    form.usageLimit ? parseInt(form.usageLimit) : null,
        expiresAt:     form.expiresAt || null,
        isActive:      form.isActive,
      };
      if (editR) {
        const { data } = await api.put(`/rewards/${editR._id}`, payload);
        setRewards((p) => p.map((r) => r._id === editR._id ? data.data : r));
        toast.success('Reward updated');
      } else {
        const { data } = await api.post('/rewards', payload);
        setRewards((p) => [data.data, ...p]);
        toast.success('Reward created');
      }
      closeModal();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (r: Reward) => {
    try {
      await api.put(`/rewards/${r._id}`, { ...r, isActive: !r.isActive });
      setRewards((p) => p.map((x) => x._id === r._id ? { ...x, isActive: !r.isActive } : x));
      toast.success(r.isActive ? 'Reward deactivated' : 'Reward activated');
    } catch { toast.error('Failed to toggle'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this reward?')) return;
    try {
      await api.delete(`/rewards/${id}`);
      setRewards((p) => p.filter((r) => r._id !== id));
      toast.success('Deleted');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Delete failed'); }
  };

  const filtered = typeFilter ? rewards.filter((r) => r.type === typeFilter) : rewards;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Rewards & Coupons</h1>
          <p className="text-sm text-gray-400 mt-0.5">{rewards.length} total rewards</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> New Reward
        </button>
      </div>

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTypeFilter('')}
          className={cn('px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
            !typeFilter ? 'bg-brand-500 text-white border-brand-500' : 'bg-white dark:bg-arena-800 border-gray-200 dark:border-arena-700 text-gray-600 dark:text-gray-300')}>
          All
        </button>
        {REWARD_TYPES.map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
              typeFilter === t ? 'bg-brand-500 text-white border-brand-500' : 'bg-white dark:bg-arena-800 border-gray-200 dark:border-arena-700 text-gray-600 dark:text-gray-300')}>
            {TYPE_ICONS[t]} {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🎁</p>
          <p>No rewards found</p>
          <button onClick={openNew} className="btn-primary mt-4 text-sm">Create first reward</button>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-arena-700">
                <tr>
                  {['Reward', 'Type', 'Code', 'Value', 'Usage', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <motion.tr key={r._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className={cn('border-t border-gray-100 dark:border-arena-700 hover:bg-gray-50 dark:hover:bg-arena-750 transition-colors',
                      !r.isActive && 'opacity-50')}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{r.name}</p>
                      {r.description && <p className="text-xs text-gray-400 truncate max-w-48">{r.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{TYPE_ICONS[r.type as RewardType]} {TYPE_LABELS[r.type as RewardType]}</span>
                    </td>
                    <td className="px-4 py-3">
                      {r.code ? (
                        <span className="font-mono text-xs bg-gray-100 dark:bg-arena-700 px-2 py-1 rounded">{r.code}</span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {r.type === 'discount_pct'   && `${r.discountPct}% off`}
                      {r.type === 'discount_fixed' && `$${r.discountFixed} off`}
                      {r.type === 'free_delivery'  && 'Free delivery'}
                      {r.type === 'free_item'      && 'Free item'}
                      {r.type === 'xp_boost'       && `${r.discountPct}× XP`}
                      {r.type === 'points_grant'   && `${r.discountFixed} pts`}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {r.usedCount}/{r.usageLimit ?? '∞'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(r)}>
                        {r.isActive
                          ? <ToggleRight size={22} className="text-green-500" />
                          : <ToggleLeft  size={22} className="text-gray-400" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-arena-700 text-gray-500 dark:text-gray-400">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(r._id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
            <motion.div className="bg-white dark:bg-arena-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-arena-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {editR ? 'Edit Reward' : 'New Reward'}
                </h2>
                <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-arena-700">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="input w-full" placeholder="10% Weekend Discount" />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    className="input w-full resize-none" rows={2} placeholder="Optional description shown to users" />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type *</label>
                  <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as RewardType }))}
                    className="input w-full">
                    {REWARD_TYPES.map((t) => (
                      <option key={t} value={t}>{TYPE_ICONS[t]} {TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>

                {/* Value fields */}
                {(form.type === 'discount_pct' || form.type === 'xp_boost') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {form.type === 'xp_boost' ? 'XP Multiplier (×)' : 'Discount %'}
                    </label>
                    <input type="number" min="0" max="100" value={form.discountPct}
                      onChange={(e) => setForm((p) => ({ ...p, discountPct: e.target.value }))}
                      className="input w-full" />
                  </div>
                )}
                {(form.type === 'discount_fixed' || form.type === 'points_grant') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {form.type === 'points_grant' ? 'Points Amount' : 'Discount Amount ($)'}
                    </label>
                    <input type="number" min="0" value={form.discountFixed}
                      onChange={(e) => setForm((p) => ({ ...p, discountFixed: e.target.value }))}
                      className="input w-full" />
                  </div>
                )}

                {/* Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Coupon Code (optional)</label>
                  <input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                    className="input w-full font-mono uppercase" placeholder="SAVE10" />
                </div>

                {/* Min order + limit */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Order ($)</label>
                    <input type="number" min="0" value={form.minOrderValue}
                      onChange={(e) => setForm((p) => ({ ...p, minOrderValue: e.target.value }))}
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usage Limit</label>
                    <input type="number" min="1" value={form.usageLimit}
                      onChange={(e) => setForm((p) => ({ ...p, usageLimit: e.target.value }))}
                      className="input w-full" placeholder="Unlimited" />
                  </div>
                </div>

                {/* Expires */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry Date (optional)</label>
                  <input type="date" value={form.expiresAt}
                    onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))}
                    className="input w-full" />
                </div>

                {/* Active toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={cn('w-10 h-6 rounded-full transition-colors', form.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-arena-600')}
                    onClick={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}>
                    <div className={cn('w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform',
                      form.isActive ? 'translate-x-4.5 ml-0.5' : 'ml-0.5')} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-arena-700">
                <button onClick={closeModal} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-arena-700">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
                  {saving ? 'Saving…' : editR ? 'Update' : 'Create'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
