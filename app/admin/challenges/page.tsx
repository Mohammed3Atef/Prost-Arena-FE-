'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Edit2, AlertTriangle, Settings as SettingsIcon, Power, BarChart3, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/api/client';
import toast from 'react-hot-toast';
import { useConfirm } from '../../../components/ui/ConfirmProvider';
import { FieldFloat } from '../../../components/ui/FieldFloat';
import { cn } from '../../../lib/utils';

interface Question { _id?: string; text: string; options: string[]; correctIndex: number; }
interface ChallengeReward { xp: number; points: number; discountPct: number; }
interface Challenge {
  _id: string;
  category: string;
  type: string;
  questions: Question[];
  timeLimit: number;
  isActive: boolean;
  reward: ChallengeReward;
}

interface ChallengeConfig {
  isEnabled:         boolean;
  maxAttemptsPerDay: number;
  enabledCategories: string[];
}

interface ChallengeParticipant {
  instanceId: string;
  date:       string | null;
  userId:     string;
  user:       { name: string; email: string; level: number } | null;
  score:      number;
  total:      number;
  isFinished: boolean;
  finishedAt: string | null;
  isWin:      boolean;
}

interface ChallengeResults {
  challenge: {
    _id: string; type: string; category: string;
    timeLimit: number; reward: ChallengeReward; questionCount: number;
  };
  stats: { totalAttempts: number; totalWins: number; winRate: number; uniquePlayers: number };
  participants: ChallengeParticipant[];
}

const CATEGORIES = ['general','student','engineer','doctor','sports','food','culture'];
const EMPTY_Q: Question = { text: '', options: ['', '', '', ''], correctIndex: 0 };
const DEFAULT_REWARD: ChallengeReward = { xp: 100, points: 50, discountPct: 10 };
const DEFAULT_CONFIG: ChallengeConfig = {
  isEnabled:         true,
  maxAttemptsPerDay: 1,
  enabledCategories: [...CATEGORIES],
};

interface FormState {
  category:  string;
  type:      string;
  timeLimit: number;
  isActive:  boolean;
  reward:    ChallengeReward;
}

const EMPTY_FORM: FormState = {
  category:  'general',
  type:      'daily',
  timeLimit: 30,
  isActive:  true,
  reward:    { ...DEFAULT_REWARD },
};

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(false);
  const [editing,    setEditing]    = useState<Challenge | null>(null);
  const [form,       setForm]       = useState<FormState>({ ...EMPTY_FORM });
  const [questions,  setQuestions]  = useState<Question[]>([{ ...EMPTY_Q }]);
  const [saving,     setSaving]     = useState(false);
  const [config,     setConfig]     = useState<ChallengeConfig>(DEFAULT_CONFIG);
  const [savingCfg,  setSavingCfg]  = useState(false);
  const [results,    setResults]    = useState<ChallengeResults | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const confirm = useConfirm();

  const openResults = async (c: Challenge) => {
    setResultsLoading(true);
    setResults({ challenge: { _id: c._id, type: c.type, category: c.category, timeLimit: c.timeLimit, reward: c.reward, questionCount: c.questions.length }, stats: { totalAttempts: 0, totalWins: 0, winRate: 0, uniquePlayers: 0 }, participants: [] });
    try {
      const { data } = await api.get(`/admin/challenges/${c._id}/results`);
      setResults(data.data ?? data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load results');
      setResults(null);
    } finally {
      setResultsLoading(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/challenges'); setChallenges(data.data ?? []); }
    catch { setChallenges([]); } finally { setLoading(false); }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const { data } = await api.get('/challenges/config');
      const c = data.data ?? data;
      setConfig({
        isEnabled:         c.isEnabled ?? true,
        maxAttemptsPerDay: c.maxAttemptsPerDay ?? 1,
        enabledCategories: c.enabledCategories ?? [...CATEGORIES],
      });
    } catch { /* keep defaults */ }
  }, []);

  const saveConfig = async (next: ChallengeConfig) => {
    setSavingCfg(true);
    try {
      const { data } = await api.put('/challenges/config', next);
      const c = data.data ?? data;
      setConfig({
        isEnabled:         c.isEnabled ?? true,
        maxAttemptsPerDay: c.maxAttemptsPerDay ?? 1,
        enabledCategories: c.enabledCategories ?? [...CATEGORIES],
      });
      toast.success('Challenge settings saved');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally {
      setSavingCfg(false);
    }
  };

  const toggleEnabled = () => saveConfig({ ...config, isEnabled: !config.isEnabled });
  const toggleCategory = (cat: string) => {
    const next = config.enabledCategories.includes(cat)
      ? config.enabledCategories.filter((c) => c !== cat)
      : [...config.enabledCategories, cat];
    saveConfig({ ...config, enabledCategories: next });
  };
  const setMaxAttempts = (n: number) => saveConfig({ ...config, maxAttemptsPerDay: Math.max(1, Math.floor(n)) });

  useEffect(() => { load(); loadConfig(); }, [load, loadConfig]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, reward: { ...DEFAULT_REWARD } });
    setQuestions([{ ...EMPTY_Q }]);
    setModal(true);
  };
  const openEdit = (c: Challenge) => {
    setEditing(c);
    setForm({
      category:  c.category,
      type:      c.type,
      timeLimit: c.timeLimit,
      isActive:  c.isActive ?? false,
      reward:    {
        xp:          c.reward?.xp          ?? DEFAULT_REWARD.xp,
        points:      c.reward?.points      ?? DEFAULT_REWARD.points,
        discountPct: c.reward?.discountPct ?? DEFAULT_REWARD.discountPct,
      },
    });
    setQuestions(c.questions.map((q) => ({ ...q, options: [...q.options] })));
    setModal(true);
  };

  const saveChallenge = async () => {
    if (questions.some((q) => !q.text.trim() || q.options.some((o) => !o.trim()))) {
      toast.error('Fill in all question fields'); return;
    }
    setSaving(true);
    try {
      const payload = { ...form, questions };
      if (editing) { await api.put(`/challenges/${editing._id}`, payload); toast.success('Updated!'); }
      else         { await api.post('/challenges', payload); toast.success('Created!'); }
      setModal(false); load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (c: Challenge) => {
    // Activating: backend will deactivate sibling challenges in the same (type, category).
    // Deactivating: simply flips this one off.
    try {
      await api.put(`/challenges/${c._id}`, { isActive: !c.isActive });
      toast.success(c.isActive ? 'Disabled' : 'Activated — others in this category disabled');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed');
    }
  };

  const deleteChallenge = async (id: string) => {
    const ok = await confirm({
      title: 'Delete challenge?',
      description: 'This will remove the challenge and its questions. This action cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try { await api.delete(`/challenges/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Challenges</h1>
          <p className="text-gray-500 text-sm mt-1">Manage daily challenge question banks</p>
        </div>
        <button
          onClick={openNew}
          disabled={!config.isEnabled}
          className={cn(
            'btn-primary flex items-center gap-2 px-4 py-2',
            !config.isEnabled && 'opacity-50 cursor-not-allowed',
          )}
          title={!config.isEnabled ? 'Enable challenges first' : undefined}
        >
          <Plus size={16} /> New Challenge
        </button>
      </div>

      {/* Settings panel */}
      <div className="card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <SettingsIcon size={18} className="text-brand-500 mt-1 shrink-0" />
            <div>
              <h2 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Challenge settings</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Toggle challenges on/off, set daily attempt limits, and pick which categories players can choose.
              </p>
            </div>
          </div>

          {/* Master toggle */}
          <button
            onClick={toggleEnabled}
            disabled={savingCfg}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors',
              config.isEnabled
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-gray-100 dark:bg-arena-700 text-gray-500',
            )}
          >
            <span className={cn(
              'inline-block w-2 h-2 rounded-full',
              config.isEnabled ? 'bg-green-500' : 'bg-gray-400',
            )} />
            {config.isEnabled ? 'Challenges enabled' : 'Challenges disabled'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldFloat label="Max attempts per day">
            <input
              type="number"
              min={1}
              max={50}
              value={config.maxAttemptsPerDay}
              onChange={(e) => setMaxAttempts(Number(e.target.value) || 1)}
              className="input"
            />
          </FieldFloat>
          <div>
            <label className="field-label">Active categories</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const on = config.enabledCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    disabled={savingCfg}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-lg font-medium capitalize transition-colors',
                      on
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 dark:bg-arena-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-arena-600',
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {!config.isEnabled && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex items-start gap-3 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Challenges are currently turned off for customers.</p>
            <p className="text-xs opacity-90 mt-0.5">Players will see a "currently disabled" message until you re-enable above.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-2xl bg-gray-100 dark:bg-arena-800 animate-pulse" />)}</div>
      ) : challenges.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">No challenges yet — create one!</div>
      ) : (
        <div className="card overflow-hidden divide-y divide-gray-50 dark:divide-arena-700">
          {challenges.map((c) => {
            const reward = c.reward ?? DEFAULT_REWARD;
            return (
              <div key={c._id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 capitalize flex items-center gap-2 flex-wrap">
                    {c.category} · <span className="text-brand-500">{c.type}</span>
                    {c.isActive ? (
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-100 dark:bg-arena-700 text-gray-500">
                        Disabled
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {c.questions.length} question{c.questions.length !== 1 ? 's' : ''} · {c.timeLimit}s each · {reward.xp} XP · {reward.points} pts · {reward.discountPct}% off
                  </p>
                </div>
                <button
                  onClick={() => toggleActive(c)}
                  title={c.isActive ? 'Disable this challenge' : 'Activate (will disable other active challenges in this category)'}
                  className={cn(
                    'p-2 rounded-xl transition-colors',
                    c.isActive
                      ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                      : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-arena-700',
                  )}
                >
                  <Power size={15} />
                </button>
                <button onClick={() => openResults(c)} title="View results" className="p-2 hover:bg-gray-100 dark:hover:bg-arena-700 rounded-xl text-blue-500"><BarChart3 size={15} /></button>
                <button onClick={() => openEdit(c)} className="p-2 hover:bg-gray-100 dark:hover:bg-arena-700 rounded-xl"><Edit2 size={15} /></button>
                <button onClick={() => deleteChallenge(c._id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-red-400"><Trash2 size={15} /></button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-arena-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{editing ? 'Edit' : 'New'} Challenge</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FieldFloat label="Category">
                <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="input capitalize">{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              </FieldFloat>
              <FieldFloat label="Type">
                <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className="input">
                  <option value="daily">Daily</option><option value="pvp">PvP</option>
                </select>
              </FieldFloat>
              <FieldFloat label="Time limit (s)">
                <input type="number" min={5} value={form.timeLimit} onChange={(e) => setForm((p) => ({ ...p, timeLimit: +e.target.value || 30 }))}
                  className="input" />
              </FieldFloat>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FieldFloat label="XP reward">
                <input type="number" min={0} value={form.reward.xp}
                  onChange={(e) => setForm((p) => ({ ...p, reward: { ...p.reward, xp: +e.target.value || 0 } }))}
                  className="input" />
              </FieldFloat>
              <FieldFloat label="Points reward">
                <input type="number" min={0} value={form.reward.points}
                  onChange={(e) => setForm((p) => ({ ...p, reward: { ...p.reward, points: +e.target.value || 0 } }))}
                  className="input" />
              </FieldFloat>
              <FieldFloat label="Discount %">
                <input type="number" min={0} max={100} value={form.reward.discountPct}
                  onChange={(e) => setForm((p) => ({ ...p, reward: { ...p.reward, discountPct: +e.target.value || 0 } }))}
                  className="input" />
              </FieldFloat>
            </div>
            <p className="text-xs text-gray-500 -mt-2">Awarded to customers who score 100% on this challenge. Discount becomes a one-time coupon.</p>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                className="w-4 h-4 accent-brand-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Activate this challenge for customers
              </span>
              <span className="text-xs text-gray-400">— only one per category can be active at a time</span>
            </label>

            <div className="space-y-4">
              {questions.map((q, qi) => (
                <div key={qi} className="border border-gray-200 dark:border-arena-600 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Question {qi + 1}</p>
                    {questions.length > 1 && <button onClick={() => setQuestions((p) => p.filter((_, i) => i !== qi))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
                  </div>
                  <FieldFloat label="Question text">
                    <input value={q.text} onChange={(e) => setQuestions((p) => p.map((x, i) => i === qi ? { ...x, text: e.target.value } : x))}
                      className="input w-full" />
                  </FieldFloat>
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input type="radio" checked={q.correctIndex === oi} onChange={() => setQuestions((p) => p.map((x, i) => i === qi ? { ...x, correctIndex: oi } : x))} />
                      <FieldFloat label={`Option ${String.fromCharCode(65 + oi)}${q.correctIndex === oi ? ' · correct' : ''}`} className="flex-1">
                        <input value={opt} onChange={(e) => setQuestions((p) => p.map((x, i) => i === qi ? { ...x, options: x.options.map((o, j) => j === oi ? e.target.value : o) } : x))}
                          className="input w-full text-sm" />
                      </FieldFloat>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <button onClick={() => setQuestions((p) => [...p, { ...EMPTY_Q }])} className="text-brand-500 text-sm font-semibold hover:underline">+ Add question</button>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(false)} className="flex-1 border border-gray-200 dark:border-arena-600 rounded-xl py-2.5 text-sm font-semibold">Cancel</button>
              <button onClick={saveChallenge} disabled={saving} className="flex-1 btn-primary py-2.5 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Results drawer */}
      <AnimatePresence>
        {results && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setResults(null)}
            />
            <motion.div
              key="drawer"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 end-0 w-full sm:max-w-lg bg-white dark:bg-arena-800 z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-arena-700">
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-gray-100 capitalize">
                    {results.challenge.category} · {results.challenge.type} results
                  </h2>
                  <p className="text-xs text-gray-500">
                    {results.challenge.questionCount} question{results.challenge.questionCount !== 1 ? 's' : ''} · {results.challenge.timeLimit}s each
                  </p>
                </div>
                <button onClick={() => setResults(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-arena-700">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <StatCard label="Attempts" value={results.stats.totalAttempts} />
                  <StatCard label="Wins" value={results.stats.totalWins} accent="text-green-500" />
                  <StatCard label="Win rate" value={`${results.stats.winRate}%`} accent="text-brand-500" />
                </div>
                <p className="text-xs text-gray-500">
                  {results.stats.uniquePlayers} unique player{results.stats.uniquePlayers !== 1 ? 's' : ''}
                </p>

                {resultsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-arena-700 animate-pulse" />
                    ))}
                  </div>
                ) : results.participants.length === 0 ? (
                  <div className="card p-8 text-center text-sm text-gray-400">
                    No attempts yet — once players try this challenge, they'll show up here.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {results.participants.map((p, i) => (
                      <div key={`${p.instanceId}-${p.userId}-${i}`} className="card p-3 flex items-center gap-3">
                        <div className={cn(
                          'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                          p.isWin ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                  : 'bg-gray-100 dark:bg-arena-700 text-gray-500',
                        )}>
                          {p.isWin ? '🏆' : `${p.score}`}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {p.user?.name || 'Unknown user'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {p.user?.email || p.userId} · Lv {p.user?.level ?? '—'}
                          </p>
                        </div>
                        <div className="text-end shrink-0">
                          <p className="text-sm font-semibold">
                            {p.score} / {p.total}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {p.finishedAt ? new Date(p.finishedAt).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'in-flight'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="card p-3 text-center">
      <p className={cn('text-xl font-bold', accent || 'text-gray-900 dark:text-gray-100')}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
