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
  const [wheel,     setWheel]     = useState<{ _id?: string; name: string; spinCooldownHours: number; segments: Segment[] } | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [segments,  setSegments]  = useState<Segment[]>([]);
  const [cooldown,  setCooldown]  = useState(24);
  const [wheelName, setWheelName] = useState('Default Wheel');

  useEffect(() => {
    api.get('/spin/wheel').then((r) => {
      const w = r.data.data;
      setWheel(w);
      setSegments(w.segments ?? []);
      setCooldown(w.spinCooldownHours ?? 24);
      setWheelName(w.name ?? 'Default Wheel');
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totalProb = segments.reduce((s, seg) => s + (seg.probability ?? 0), 0);

  const updateSeg = (i: number, field: keyof Segment, value: any) => {
    setSegments((p) => p.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  const addSegment = () => setSegments((p) => [...p, { ...EMPTY_SEG, color: PALETTE[p.length % PALETTE.length] }]);

  const removeSeg = (i: number) => setSegments((p) => p.filter((_, idx) => idx !== i));

  const autoBalance = () => {
    const each = parseFloat((1 / segments.length).toFixed(4));
    setSegments((p) => p.map((s) => ({ ...s, probability: each })));
    toast.success('Probabilities balanced equally');
  };

  const save = async () => {
    if (segments.length < 2) return toast.error('Need at least 2 segments');
    if (segments.some((s) => !s.label.trim())) return toast.error('All segments need a label');
    const sum = segments.reduce((a, s) => a + s.probability, 0);
    if (Math.abs(sum - 1) > 0.01) return toast.error(`Probabilities must sum to 1.00 (currently ${sum.toFixed(3)})`);

    setSaving(true);
    try {
      await api.put('/spin/wheel', { name: wheelName, spinCooldownHours: cooldown, segments });
      toast.success('Wheel saved!');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="skeleton h-64 rounded-2xl" />;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Spin Wheel</h1>
          <p className="text-sm text-gray-400 mt-0.5">{segments.length} segments · probability sum: <span className={cn('font-semibold', Math.abs(totalProb - 1) < 0.01 ? 'text-green-500' : 'text-red-500')}>{totalProb.toFixed(3)}</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={autoBalance} className="btn-secondary gap-2 text-sm"><RefreshCw size={14} /> Auto-balance</button>
          <button onClick={save} disabled={saving} className="btn-primary gap-2 text-sm"><Save size={14} /> {saving ? 'Saving…' : 'Save Wheel'}</button>
        </div>
      </div>

      {/* Wheel Settings */}
      <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="field-label">Wheel Name</label>
          <input className="input" value={wheelName} onChange={(e) => setWheelName(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Spin Cooldown (hours)</label>
          <input type="number" min="1" max="168" className="input" value={cooldown} onChange={(e) => setCooldown(parseInt(e.target.value))} />
        </div>
      </div>

      {/* Visual preview */}
      <div className="card p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Preview</p>
        <div className="flex flex-wrap gap-2">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold" style={{ backgroundColor: seg.color }}>
              <span>{seg.icon}</span><span>{seg.label || 'Untitled'}</span>
              <span className="opacity-70">({(seg.probability * 100).toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Segments */}
      <div className="space-y-3">
        {segments.map((seg, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
            <div className="flex items-start gap-3">
              {/* Color swatch */}
              <div className="shrink-0 mt-1">
                <div className="w-8 h-8 rounded-lg border-2 border-gray-200 dark:border-arena-600 overflow-hidden cursor-pointer"
                  style={{ backgroundColor: seg.color }}>
                  <input type="color" value={seg.color} onChange={(e) => updateSeg(i, 'color', e.target.value)}
                    className="opacity-0 w-full h-full cursor-pointer" />
                </div>
              </div>

              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="field-label">Label</label>
                  <input className="input text-sm" value={seg.label} onChange={(e) => updateSeg(i, 'label', e.target.value)} placeholder="50 XP" />
                </div>
                <div>
                  <label className="field-label">Icon</label>
                  <input className="input text-xl text-center" value={seg.icon} onChange={(e) => updateSeg(i, 'icon', e.target.value)} placeholder="⚡" />
                </div>
                <div>
                  <label className="field-label">Type</label>
                  <select className="input text-sm" value={seg.type} onChange={(e) => updateSeg(i, 'type', e.target.value)}>
                    {SEGMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {seg.type === 'xp_boost' && (
                  <div>
                    <label className="field-label">XP Amount</label>
                    <input type="number" min="0" className="input text-sm" value={seg.xpAmount} onChange={(e) => updateSeg(i, 'xpAmount', parseInt(e.target.value))} />
                  </div>
                )}
                {seg.type === 'points' && (
                  <div>
                    <label className="field-label">Points</label>
                    <input type="number" min="0" className="input text-sm" value={seg.pointsAmount} onChange={(e) => updateSeg(i, 'pointsAmount', parseInt(e.target.value))} />
                  </div>
                )}
                <div>
                  <label className="field-label">Probability</label>
                  <input type="number" step="0.01" min="0" max="1" className="input text-sm" value={seg.probability}
                    onChange={(e) => updateSeg(i, 'probability', parseFloat(e.target.value))} />
                </div>
              </div>

              <button onClick={() => removeSeg(i)} className="shrink-0 p-1.5 mt-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <button onClick={addSegment} className="btn-secondary gap-2 w-full text-sm"><Plus size={15} /> Add Segment</button>
    </div>
  );
}
