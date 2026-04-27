'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import api from '../../../services/api/client';
import toast from 'react-hot-toast';

interface Question { _id?: string; text: string; options: string[]; correctIndex: number; }
interface Challenge { _id: string; category: string; type: string; questions: Question[]; timeLimit: number; }

const CATEGORIES = ['general','student','engineer','doctor','sports','food','culture'];
const EMPTY_Q: Question = { text: '', options: ['', '', '', ''], correctIndex: 0 };

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(false);
  const [editing,    setEditing]    = useState<Challenge | null>(null);
  const [form,       setForm]       = useState({ category: 'general', type: 'daily', timeLimit: 30 });
  const [questions,  setQuestions]  = useState<Question[]>([{ ...EMPTY_Q }]);
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/challenges'); setChallenges(data.data ?? []); }
    catch { setChallenges([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm({ category: 'general', type: 'daily', timeLimit: 30 }); setQuestions([{ ...EMPTY_Q }]); setModal(true); };
  const openEdit = (c: Challenge) => { setEditing(c); setForm({ category: c.category, type: c.type, timeLimit: c.timeLimit }); setQuestions(c.questions.map((q) => ({ ...q, options: [...q.options] }))); setModal(true); };

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

  const deleteChallenge = async (id: string) => {
    if (!confirm('Delete this challenge?')) return;
    try { await api.delete(`/challenges/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Challenges</h1>
          <p className="text-gray-500 text-sm mt-1">Manage daily challenge question banks</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 px-4 py-2">
          <Plus size={16} /> New Challenge
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-2xl bg-gray-100 dark:bg-arena-800 animate-pulse" />)}</div>
      ) : challenges.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">No challenges yet — create one!</div>
      ) : (
        <div className="card overflow-hidden divide-y divide-gray-50 dark:divide-arena-700">
          {challenges.map((c) => (
            <div key={c._id} className="flex items-center gap-4 px-4 py-3">
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{c.category} · <span className="text-brand-500">{c.type}</span></p>
                <p className="text-xs text-gray-500">{c.questions.length} questions · {c.timeLimit}s each</p>
              </div>
              <button onClick={() => openEdit(c)} className="p-2 hover:bg-gray-100 dark:hover:bg-arena-700 rounded-xl"><Edit2 size={15} /></button>
              <button onClick={() => deleteChallenge(c._id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-red-400"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-arena-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{editing ? 'Edit' : 'New'} Challenge</h2>
            <div className="grid grid-cols-3 gap-3">
              <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="input capitalize">{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className="input">
                <option value="daily">Daily</option><option value="pvp">PvP</option>
              </select>
              <input type="number" value={form.timeLimit} onChange={(e) => setForm((p) => ({ ...p, timeLimit: +e.target.value }))}
                placeholder="Time (s)" className="input" />
            </div>
            <div className="space-y-4">
              {questions.map((q, qi) => (
                <div key={qi} className="border border-gray-200 dark:border-arena-600 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Question {qi + 1}</p>
                    {questions.length > 1 && <button onClick={() => setQuestions((p) => p.filter((_, i) => i !== qi))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
                  </div>
                  <input value={q.text} onChange={(e) => setQuestions((p) => p.map((x, i) => i === qi ? { ...x, text: e.target.value } : x))}
                    placeholder="Question text" className="input w-full" />
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input type="radio" checked={q.correctIndex === oi} onChange={() => setQuestions((p) => p.map((x, i) => i === qi ? { ...x, correctIndex: oi } : x))} />
                      <input value={opt} onChange={(e) => setQuestions((p) => p.map((x, i) => i === qi ? { ...x, options: x.options.map((o, j) => j === oi ? e.target.value : o) } : x))}
                        placeholder={`Option ${String.fromCharCode(65 + oi)}`} className="input flex-1 text-sm" />
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
    </div>
  );
}
