'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../../../services/api/client';
import { cn } from '../../../lib/utils';
import toast from 'react-hot-toast';
import { useConfirm } from '../../../components/ui/ConfirmProvider';

interface Mission {
  _id: string; title: string; description: string; icon: string | null;
  type: string; target: number;
  reward: { xp: number; points: number; rewardId: string | null };
  isActive: boolean; isRepeatable: boolean; repeatEvery: string | null; sortOrder: number;
}

interface RewardLite {
  _id: string;
  name: string;
  type: string;
  code: string | null;
}

// Mission types must match the schema enum in lib/db/models/mission.ts.
const MISSION_TYPES = [
  'order_count', 'order_new_item', 'challenge_win', 'referral',
  'spin', 'login_streak', 'spend_amount',
] as const;

const TYPE_ICONS: Record<string, string> = {
  order_count:    '🛒',
  order_new_item: '🍔',
  challenge_win:  '🏆',
  referral:       '👥',
  spin:           '🎡',
  login_streak:   '🔥',
  spend_amount:   '💰',
};

const TYPE_LABELS: Record<string, string> = {
  order_count:    'Place N orders',
  order_new_item: 'Try new items',
  challenge_win:  'Win N challenges',
  referral:       'Refer N friends',
  spin:           'Spin the wheel N times',
  login_streak:   'Login streak (days)',
  spend_amount:   'Spend total amount',
};

const EMPTY_FORM = {
  title: '', description: '', icon: '',
  type: 'order_count' as (typeof MISSION_TYPES)[number],
  target: '3',
  xpReward: '0', pointsReward: '0', rewardId: '',
  isRepeatable: false, repeatEvery: '',
  sortOrder: '0', isActive: true,
};

export default function AdminMissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [rewards,  setRewards]  = useState<RewardLite[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [editM,    setEditM]    = useState<Mission | null>(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/missions/all');
      setMissions(data.data ?? []);
    } catch { setMissions([]); }
    finally { setLoading(false); }
  }, []);

  const loadRewards = useCallback(async () => {
    try {
      const { data } = await api.get('/rewards', { params: { limit: 200 } });
      setRewards(data.data ?? []);
    } catch { setRewards([]); }
  }, []);

  useEffect(() => { load(); loadRewards(); }, [load, loadRewards]);

  const openNew = () => { setEditM(null); setForm({ ...EMPTY_FORM }); setModal(true); };
  const openEdit = (m: Mission) => {
    setEditM(m);
    setForm({
      title: m.title, description: m.description, icon: m.icon ?? '',
      type: m.type as (typeof MISSION_TYPES)[number],
      target: String(m.target),
      xpReward:     String(m.reward.xp     ?? 0),
      pointsReward: String(m.reward.points ?? 0),
      rewardId:     m.reward.rewardId ?? '',
      isRepeatable: m.isRepeatable,
      repeatEvery:  m.repeatEvery ?? '',
      sortOrder:    String(m.sortOrder),
      isActive:     m.isActive,
    });
    setModal(true);
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error('Title is required');
    const xp     = parseInt(form.xpReward)     || 0;
    const points = parseInt(form.pointsReward) || 0;
    const rewardId = form.rewardId || null;
    if (xp <= 0 && points <= 0 && !rewardId) {
      return toast.error('Add at least one reward — XP, points, or a coupon');
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        icon: form.icon || null,
        type: form.type,
        target: parseInt(form.target) || 1,
        reward: { xp, points, rewardId },
        isRepeatable: form.isRepeatable,
        repeatEvery: form.repeatEvery || null,
        sortOrder: parseInt(form.sortOrder) || 0,
        isActive: form.isActive,
      };
      if (editM) { await api.put(`/missions/${editM._id}`, payload); toast.success('Mission updated'); }
      else       { await api.post('/missions', payload); toast.success('Mission created'); }
      setModal(false); load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (m: Mission) => {
    try {
      await api.put(`/missions/${m._id}`, { isActive: !m.isActive });
      setMissions((p) => p.map((x) => x._id === m._id ? { ...x, isActive: !m.isActive } : x));
    } catch { toast.error('Update failed'); }
  };

  const del = async (id: string) => {
    const ok = await confirm({
      title: 'Delete mission?',
      description: 'The mission will be deactivated and disappear from users’ lists.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try { await api.put(`/missions/${id}`, { isActive: false }); setMissions((p) => p.filter((m) => m._id !== id)); toast.success('Mission deactivated'); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Missions</h1>
          <p className="text-sm text-gray-400 mt-0.5">{missions.length} missions</p>
        </div>
        <button onClick={openNew} className="btn-primary gap-2 text-sm"><Plus size={16} /> New Mission</button>
      </div>

      <div className="space-y-3">
        {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />) :
          missions.map((m) => (
            <motion.div key={m._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className={cn('card p-5 flex items-center gap-4', !m.isActive && 'opacity-50')}>
              <div className="text-2xl w-10 text-center shrink-0">{m.icon || TYPE_ICONS[m.type] || '🎯'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{m.title}</span>
                  <span className="text-xs bg-gray-100 dark:bg-arena-700 text-gray-500 px-2 py-0.5 rounded-full capitalize">{m.type.replace(/_/g,' ')}</span>
                  {m.isRepeatable && <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-500 px-2 py-0.5 rounded-full capitalize">{m.repeatEvery}</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{m.description}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs flex-wrap">
                  {m.reward.xp > 0     && <span className="text-brand-500 font-medium">+{m.reward.xp} XP</span>}
                  {m.reward.points > 0 && <span className="text-gold-500 font-medium">+{m.reward.points} pts</span>}
                  {m.reward.rewardId   && <span className="text-purple-500 font-medium">🎁 coupon</span>}
                  <span className="text-gray-400">Target: {m.target}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleActive(m)}>
                  {m.isActive ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} className="text-gray-400" />}
                </button>
                <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-arena-700 text-gray-400 hover:text-brand-500 transition-colors"><Edit2 size={14} /></button>
                <button onClick={() => del(m._id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
              </div>
            </motion.div>
          ))}
        {!loading && missions.length === 0 && (
          <div className="card py-16 text-center text-gray-400"><p className="text-4xl mb-3">🎯</p><p>No missions yet</p></div>
        )}
      </div>

      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-arena-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-arena-700 shrink-0">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{editM ? 'Edit Mission' : 'New Mission'}</h2>
                <button onClick={() => setModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-arena-700 text-gray-400"><X size={18} /></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4">
                <div><label className="field-label">Title *</label><input className="input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Order 3 times this week" /></div>
                <div><label className="field-label">Description</label><input className="input" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Short description for users…" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">Type</label>
                    <select className="input" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as (typeof MISSION_TYPES)[number] }))}>
                      {MISSION_TYPES.map((t) => <option key={t} value={t}>{TYPE_ICONS[t]} {TYPE_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div><label className="field-label">Icon (emoji)</label><input className="input text-xl" value={form.icon} onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))} placeholder="🎯" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="field-label">Target</label><input type="number" min="1" className="input" value={form.target} onChange={(e) => setForm((p) => ({ ...p, target: e.target.value }))} /></div>
                  <div><label className="field-label">XP Reward</label><input type="number" min="0" className="input" value={form.xpReward} onChange={(e) => setForm((p) => ({ ...p, xpReward: e.target.value }))} /></div>
                  <div><label className="field-label">Points</label><input type="number" min="0" className="input" value={form.pointsReward} onChange={(e) => setForm((p) => ({ ...p, pointsReward: e.target.value }))} /></div>
                </div>
                <div>
                  <label className="field-label">Bonus coupon (optional)</label>
                  <select
                    className="input"
                    value={form.rewardId}
                    onChange={(e) => setForm((p) => ({ ...p, rewardId: e.target.value }))}
                  >
                    <option value="">— No coupon —</option>
                    {rewards.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name}{r.code ? ` · ${r.code}` : ''} ({r.type.replace(/_/g, ' ')})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Granted as a one-use UserReward when the player claims this mission. Set XP/Points to 0 if the coupon is the only reward.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">Repeat</label>
                    <select className="input" value={form.repeatEvery} onChange={(e) => setForm((p) => ({ ...p, repeatEvery: e.target.value, isRepeatable: !!e.target.value }))}>
                      <option value="">One-time</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div><label className="field-label">Sort Order</label><input type="number" min="0" className="input" value={form.sortOrder} onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))} /></div>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4 rounded accent-brand-500" />
                  <span className="text-gray-700 dark:text-gray-300">Active (visible to users)</span>
                </label>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
                  <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : editM ? 'Save Changes' : 'Create Mission'}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
