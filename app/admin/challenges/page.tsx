'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight, CheckCircle, Settings, BookOpen, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../../../services/api/client';
import { cn } from '../../../lib/utils';
import toast from 'react-hot-toast';

interface Question {
  _id: string; text: string; options: string[]; correctIndex: number;
  category: string; difficulty: 'easy' | 'medium' | 'hard'; points: number;
  explanation?: string; isActive: boolean;
}

interface ChallengeConfig {
  isEnabled: boolean;
  maxAttemptsPerDay: number;
  enabledCategories: string[];
}

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const CATEGORIES   = ['general', 'student', 'engineer', 'doctor', 'sports', 'food', 'culture'];
const DIFF_COLORS  = { easy: 'text-green-500 bg-green-50 dark:bg-green-900/20', medium: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20', hard: 'text-red-500 bg-red-50 dark:bg-red-900/20' };
const CATEGORY_ICONS: Record<string, string> = { general: '🌐', student: '📚', engineer: '⚙️', doctor: '🩺', sports: '⚽', food: '🍔', culture: '🎭' };

const EMPTY_FORM = { text: '', options: ['', '', '', ''], correctIndex: 0, category: 'general', difficulty: 'medium' as const, points: '10', explanation: '' };

// ── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab() {
  const [config,  setConfig]  = useState<ChallengeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    api.get('/challenges/config')
      .then(({ data }) => setConfig(data.data))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.put('/challenges/config', config);
      toast.success('Settings saved');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (cat: string) => {
    if (!config) return;
    const has = config.enabledCategories.includes(cat);
    setConfig({
      ...config,
      enabledCategories: has
        ? config.enabledCategories.filter((c) => c !== cat)
        : [...config.enabledCategories, cat],
    });
  };

  if (loading) return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
    </div>
  );

  if (!config) return null;

  return (
    <div className="max-w-xl space-y-6">
      {/* Enable / disable challenges */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">Challenges enabled</p>
            <p className="text-sm text-gray-400 mt-0.5">Turn off to hide challenges from all users</p>
          </div>
          <button
            onClick={() => setConfig({ ...config, isEnabled: !config.isEnabled })}
            className="text-brand-500 hover:text-brand-600 transition-colors"
          >
            {config.isEnabled
              ? <ToggleRight size={36} className="text-brand-500" />
              : <ToggleLeft  size={36} className="text-gray-400" />}
          </button>
        </div>
      </div>

      {/* Max attempts per day */}
      <div className="card p-5 space-y-3">
        <div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">Max attempts per day</p>
          <p className="text-sm text-gray-400 mt-0.5">How many times a user can play each day (1–50)</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setConfig({ ...config, maxAttemptsPerDay: Math.max(1, config.maxAttemptsPerDay - 1) })}
            className="w-9 h-9 rounded-xl border border-gray-200 dark:border-arena-600 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-arena-700 transition-colors font-bold text-lg"
          >−</button>
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 w-10 text-center">
            {config.maxAttemptsPerDay}
          </span>
          <button
            onClick={() => setConfig({ ...config, maxAttemptsPerDay: Math.min(50, config.maxAttemptsPerDay + 1) })}
            className="w-9 h-9 rounded-xl border border-gray-200 dark:border-arena-600 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-arena-700 transition-colors font-bold text-lg"
          >+</button>
          <span className="text-sm text-gray-400">per day</span>
        </div>
      </div>

      {/* Enabled categories */}
      <div className="card p-5 space-y-3">
        <div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">Enabled categories</p>
          <p className="text-sm text-gray-400 mt-0.5">Users can only access categories checked here</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((cat) => {
            const enabled = config.enabledCategories.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all text-left',
                  enabled
                    ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                    : 'border-gray-100 dark:border-arena-700 text-gray-500 dark:text-gray-400 hover:border-gray-200 dark:hover:border-arena-600',
                )}
              >
                <span className="text-base">{CATEGORY_ICONS[cat] ?? '📁'}</span>
                <span className="text-sm font-medium capitalize">{cat}</span>
                {enabled && <CheckCircle size={14} className="ml-auto text-brand-500 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary w-full py-3">
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminChallengesPage() {
  const [tab,       setTab]       = useState<'questions' | 'settings'>('questions');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [page,      setPage]      = useState(1);
  const [total,     setTotal]     = useState(0);
  const [catFilter, setCatFilter] = useState('');
  const [difFilter, setDifFilter] = useState('');
  const [modal,     setModal]     = useState(false);
  const [editQ,     setEditQ]     = useState<Question | null>(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const LIMIT = 15;

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: String(LIMIT) };
    if (catFilter) params.category   = catFilter;
    if (difFilter) params.difficulty = difFilter;
    try {
      const { data } = await api.get('/challenges/questions', { params });
      setQuestions(data.data ?? []);
      setTotal(data.pagination?.total ?? 0);
    } catch { setQuestions([]); }
    finally { setLoading(false); }
  }, [page, catFilter, difFilter]);

  useEffect(() => { setPage(1); }, [catFilter, difFilter]);
  useEffect(() => { if (tab === 'questions') load(); }, [load, tab]);

  const openNew = () => { setEditQ(null); setForm(EMPTY_FORM); setModal(true); };

  const openEdit = (q: Question) => {
    setEditQ(q);
    setForm({ text: q.text, options: [...q.options], correctIndex: q.correctIndex,
      category: q.category, difficulty: q.difficulty, points: String(q.points), explanation: q.explanation ?? '' });
    setModal(true);
  };

  const save = async () => {
    if (!form.text.trim()) return toast.error('Question text is required');
    if (form.options.some((o) => !o.trim())) return toast.error('All 4 options are required');
    setSaving(true);
    try {
      const payload = { ...form, points: parseInt(form.points) };
      if (editQ) {
        await api.put(`/challenges/questions/${editQ._id}`, payload);
        toast.success('Question updated');
      } else {
        await api.post('/challenges/questions', payload);
        toast.success('Question created');
      }
      setModal(false);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const deactivate = async (id: string) => {
    if (!confirm('Deactivate this question?')) return;
    try {
      await api.delete(`/challenges/questions/${id}`);
      setQuestions((p) => p.filter((q) => q._id !== id));
      setTotal((p) => p - 1);
      toast.success('Question deactivated');
    } catch { toast.error('Failed'); }
  };

  const setOption = (i: number, val: string) =>
    setForm((p) => { const opts = [...p.options]; opts[i] = val; return { ...p, options: opts }; });

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Challenges</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {tab === 'questions' ? `${total} questions in bank` : 'Configure challenge behaviour'}
          </p>
        </div>
        {tab === 'questions' && (
          <button onClick={openNew} className="btn-primary gap-2 text-sm"><Plus size={16} /> New Question</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-arena-800 rounded-xl p-1 w-fit">
        {([['questions', 'Questions', BookOpen], ['settings', 'Settings', Settings]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === key
                ? 'bg-white dark:bg-arena-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Settings tab */}
      {tab === 'settings' && <SettingsTab />}

      {/* Questions tab */}
      {tab === 'questions' && (
        <>
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
              className="bg-white dark:bg-arena-800 border border-gray-100 dark:border-arena-700 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300 outline-none">
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
            <select value={difFilter} onChange={(e) => setDifFilter(e.target.value)}
              className="bg-white dark:bg-arena-800 border border-gray-100 dark:border-arena-700 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300 outline-none">
              <option value="">All Difficulties</option>
              {DIFFICULTIES.map((d) => <option key={d} value={d} className="capitalize">{d}</option>)}
            </select>
          </div>

          {/* Questions List */}
          <div className="space-y-3">
            {loading ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-2xl" />
            )) : questions.map((q) => (
              <motion.div key={q._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="card p-5 flex gap-4 items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full capitalize', DIFF_COLORS[q.difficulty])}>{q.difficulty}</span>
                    <span className="text-xs bg-gray-100 dark:bg-arena-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full capitalize">
                      {CATEGORY_ICONS[q.category] ?? ''} {q.category}
                    </span>
                    <span className="text-xs text-brand-500 font-medium">{q.points} pts</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{q.text}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {q.options.map((opt, i) => (
                      <div key={i} className={cn('text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5',
                        i === q.correctIndex
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium'
                          : 'bg-gray-50 dark:bg-arena-700/50 text-gray-500 dark:text-gray-400')}>
                        {i === q.correctIndex && <CheckCircle size={11} className="shrink-0" />}
                        {String.fromCharCode(65 + i)}. {opt}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(q)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-arena-700 text-gray-400 hover:text-brand-500 transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => deactivate(q._id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                </div>
              </motion.div>
            ))}
            {!loading && questions.length === 0 && (
              <div className="py-20 text-center text-gray-400">
                <p className="text-4xl mb-3">🏆</p>
                <p>No questions yet. Create one to get started.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">Page {page} of {pages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 dark:border-arena-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-arena-800 transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
                  className="p-2 rounded-lg border border-gray-200 dark:border-arena-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-arena-800 transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Question Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-arena-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-arena-700 shrink-0">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{editQ ? 'Edit Question' : 'New Question'}</h2>
                <button onClick={() => setModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-arena-700 text-gray-400"><X size={18} /></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4">
                <div>
                  <label className="field-label">Question *</label>
                  <textarea className="input resize-none h-20" value={form.text} onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))} placeholder="Enter question text…" />
                </div>

                <div>
                  <label className="field-label">Answer Options (click ✓ to mark correct)</label>
                  <div className="space-y-2">
                    {form.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <button onClick={() => setForm((p) => ({ ...p, correctIndex: i }))}
                          className={cn('shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                            form.correctIndex === i ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 dark:border-arena-600 text-transparent')}>
                          <CheckCircle size={13} />
                        </button>
                        <input className="input flex-1" value={opt} onChange={(e) => setOption(i, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="field-label">Category</label>
                    <select className="input" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                      {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Difficulty</label>
                    <select className="input" value={form.difficulty} onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value as typeof form.difficulty }))}>
                      {DIFFICULTIES.map((d) => <option key={d} value={d} className="capitalize">{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Points</label>
                    <input type="number" min="1" className="input" value={form.points} onChange={(e) => setForm((p) => ({ ...p, points: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <label className="field-label">Explanation (optional)</label>
                  <input className="input" value={form.explanation} onChange={(e) => setForm((p) => ({ ...p, explanation: e.target.value }))} placeholder="Shown after the player answers…" />
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
                  <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : editQ ? 'Save Changes' : 'Create Question'}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
