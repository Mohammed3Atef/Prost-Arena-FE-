'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Save, RefreshCw } from 'lucide-react';
import api from '../../../services/api/client';
import { cn } from '../../../lib/utils';
import toast from 'react-hot-toast';

interface Segment {
  label: string; type: 'xp_boost' | 'points' | 'reward' | 'empty' | 'free_item';
  xpAmount: number; pointsAmount: number; probability: number; color: string; icon: string;
}

const SEGMENT_TYPES = ['xp_boost', 'points', 'empty', 'free_item'] as const;
const PALETTE = ['#ff6b35','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#06b6d4','#ec4899','#84cc16','#f97316'];
const EMPTY_SEG: Segment = { label: '', type: 'xp_boost', xpAmount: 50, pointsAmount: 0, probability: 0.1, color: '#ff6b35', icon: '⚡' };

export default function AdminSpinWheelPage() {
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [segments,  setSegments]  = useState<Segment[]>([]);
  const [cooldown,  setCooldown]  = useState(24);
  const [wheelName, setWheelName] = useState('Default Wheel');

  useEffect(() => {
    api.get('/spin/wheel').then((r) => {
      const w = r.data.data;
      setSegments(w.segments ?? []);
      setCooldown(w.spinCooldownHours ?? 24);
      setWheelName(w.name ?? 'Default Wheel');
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totalProb = segments.reduce((s, seg) => s + (seg.probability ?? 0), 0);

  const updateSeg = (i: number, field: keyof Segment, value: any) => {
    setSegments((p) => p.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  const addSegment  = () => setSegments((p) => [...p, { ...EMPTY_SEG, color: PALETTE[p.length % PALETTE.length] }]);
  const removeSeg   = (i: number) => setSegments((p) => p.filter((_, idx) => idx !== i));

  const autoBalance = () => {
    if (!segments.length) return;
    const each = parseFloat((1 / segments.length).toFixed(4));
    setSegments((p) => p.map((s) => ({ ...s, probability: each })));
    toast.success('Probabilities balanced equally');
  };

  const save = async () => {
    if (segments.length < 2)                        return toast.error('Need at least 2 segments');
    if (segments.some((s) => !s.label.trim()))      return toast.error('All segments need a label');
    if (Math.abs(totalProb - 1) > 0.01)             return toast.error(`Probabilities must sum to 1.00 (currently ${totalProb.toFixed(3)})`);

    setSaving(true);
    try {
      await api.put('/spin/wheel', { name: wheelName, spinCooldownHours: cooldown, segments });
      toast.success('Wheel saved!');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
    </div>
  );

  const probPct = Math.round(totalProb * 100);
  const probOk  = Math.abs(totalProb - 1) <= 0.01;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Spin Wheel</h1>
          <p className="text-sm text-gray-400 mt-0.5">Configure segments and probabilities</p>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
          <Save size={15} /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Wheel settings */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Wheel Settings</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Wheel Name</label>
            <input value={wheelName} onChange={(e) => setWheelName(e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cooldown (hours between spins)</label>
            <input type="number" min="1" max="168" value={cooldown} onChange={(e) => setCooldown(Number(e.target.value))} className="input w-full" />
          </div>
        </div>
      </div>

      {/* Probability meter */}
      <div className="card space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Total probability: <span className={probOk ? 'text-green-500' : 'text-red-500'}>{probPct}%</span>
            {!probOk && <span className="text-red-500 ml-2 text-xs">Must equal 100%</span>}
          </span>
          <button onClick={autoBalance} className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-600 font-medium">
            <RefreshCw size={12} /> Auto-balance
          </button>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-arena-700 rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', probOk ? 'bg-green-500' : probPct > 100 ? 'bg-red-500' : 'bg-brand-500')}
            style={{ width: `${Math.min(probPct, 100)}%` }} />
        </div>
      </div>

      {/* Segments */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Segments ({segments.length})</h2>
          <button onClick={addSegment} className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-600 font-medium">
            <Plus size={14} /> Add Segment
          </button>
        </div>

        {segments.length === 0 && (
          <p className="text-center text-gray-400 py-8">No segments yet. Add at least 2.</p>
        )}

        <div className="space-y-3">
          {segments.map((seg, i) => (
            <motion.div key={i} layout
              className="flex gap-3 p-3 bg-gray-50 dark:bg-arena-750 rounded-xl items-start flex-wrap sm:flex-nowrap">
              {/* Color swatch */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className="w-8 h-8 rounded-lg border-2 border-white shadow cursor-pointer" style={{ backgroundColor: seg.color }}
                  onClick={() => {
                    const idx = PALETTE.indexOf(seg.color);
                    updateSeg(i, 'color', PALETTE[(idx + 1) % PALETTE.length]);
                  }} />
                <span className="text-xs text-gray-400">color</span>
              </div>

              {/* Icon */}
              <div className="shrink-0">
                <input value={seg.icon} onChange={(e) => updateSeg(i, 'icon', e.target.value)}
                  className="input w-14 text-center text-lg" maxLength={2} />
              </div>

              {/* Label */}
              <div className="flex-1 min-w-32">
                <input value={seg.label} onChange={(e) => updateSeg(i, 'label', e.target.value)}
                  className="input w-full text-sm" placeholder="Segment label" />
              </div>

              {/* Type */}
              <div className="shrink-0">
                <select value={seg.type} onChange={(e) => updateSeg(i, 'type', e.target.value)}
                  className="input text-sm">
                  {SEGMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Amount */}
              {seg.type === 'xp_boost' && (
                <div className="shrink-0 w-24">
                  <input type="number" min="0" value={seg.xpAmount} onChange={(e) => updateSeg(i, 'xpAmount', Number(e.target.value))}
                    className="input w-full text-sm" placeholder="XP" />
                </div>
              )}
              {seg.type === 'points' && (
                <div className="shrink-0 w-24">
                  <input type="number" min="0" value={seg.pointsAmount} onChange={(e) => updateSeg(i, 'pointsAmount', Number(e.target.value))}
                    className="input w-full text-sm" placeholder="Pts" />
                </div>
              )}

              {/* Probability */}
              <div className="shrink-0 w-24">
                <input type="number" min="0" max="1" step="0.01" value={seg.probability}
                  onChange={(e) => updateSeg(i, 'probability', parseFloat(e.target.value) || 0)}
                  className="input w-full text-sm" placeholder="0.10" />
              </div>

              {/* Remove */}
              <button onClick={() => removeSeg(i)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 shrink-0">
                <Trash2 size={15} />
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Preview */}
      {segments.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Preview</h2>
          <div className="flex flex-wrap gap-2">
            {segments.map((seg, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl text-white text-sm font-semibold"
                style={{ backgroundColor: seg.color }}>
                <span>{seg.icon}</span>
                <span>{seg.label || 'Untitled'}</span>
                <span className="opacity-75 text-xs">({Math.round(seg.probability * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
