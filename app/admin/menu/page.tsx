'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, X, Tag, Layers } from 'lucide-react';
import api from '../../../services/api/client';
import { formatCurrency, cn } from '../../../lib/utils';
import toast from 'react-hot-toast';

interface Category { _id: string; name: string; icon: string | null; slug: string; isActive: boolean; sortOrder: number; }
interface MenuItem  { _id: string; name: string; description: string; price: number; category: Category | null; isAvailable: boolean; isSecret: boolean; xpReward: number; tags: string[]; requiredLevel: number; image: string | null; }

const EMPTY_ITEM = { name: '', description: '', price: '', category: '', xpReward: '10', requiredLevel: '1', tags: '', isSecret: false, isAvailable: true, image: '' };
const EMPTY_CAT  = { name: '', icon: '', description: '', sortOrder: '0' };

export default function AdminMenuPage() {
  const [tab,       setTab]       = useState<'items' | 'categories'>('items');
  const [items,     setItems]     = useState<MenuItem[]>([]);
  const [cats,      setCats]      = useState<Category[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filterCat, setFilterCat] = useState('');

  const [itemModal, setItemModal] = useState(false);
  const [catModal,  setCatModal]  = useState(false);
  const [editItem,  setEditItem]  = useState<MenuItem | null>(null);
  const [editCat,   setEditCat]   = useState<Category | null>(null);
  const [form,      setForm]      = useState<typeof EMPTY_ITEM>(EMPTY_ITEM);
  const [catForm,   setCatForm]   = useState<typeof EMPTY_CAT>(EMPTY_CAT);
  const [saving,    setSaving]    = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { limit: '100' };
    if (search)    params.search   = search;
    if (filterCat) params.category = filterCat;
    try {
      const { data } = await api.get('/menu/items/all', { params });
      setItems(data.data ?? []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [search, filterCat]);

  const loadCats = useCallback(async () => {
    const { data } = await api.get('/menu/categories/all').catch(() => ({ data: { data: [] } }));
    setCats(data.data ?? []);
  }, []);

  useEffect(() => { loadItems(); loadCats(); }, [loadItems, loadCats]);

  const openNewItem = () => { setEditItem(null); setForm(EMPTY_ITEM); setItemModal(true); };
  const openEditItem = (item: MenuItem) => {
    setEditItem(item);
    setForm({ name: item.name, description: item.description, price: String(item.price),
      category: (item.category as any)?._id ?? '', xpReward: String(item.xpReward),
      requiredLevel: String(item.requiredLevel), tags: item.tags?.join(', ') ?? '',
      isSecret: item.isSecret, isAvailable: item.isAvailable, image: item.image ?? '' });
    setItemModal(true);
  };

  const saveItem = async () => {
    if (!form.name || !form.price || !form.category) return toast.error('Name, price and category are required');
    setSaving(true);
    try {
      const payload = { ...form, price: parseFloat(form.price), xpReward: parseInt(form.xpReward),
        requiredLevel: parseInt(form.requiredLevel), tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean) };
      if (editItem) { await api.put(`/menu/items/${editItem._id}`, payload); toast.success('Item updated'); }
      else          { await api.post('/menu/items', payload); toast.success('Item created'); }
      setItemModal(false); loadItems();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try { await api.delete(`/menu/items/${id}`); setItems((p) => p.filter((i) => i._id !== id)); toast.success('Deleted'); }
    catch { toast.error('Delete failed'); }
  };

  const toggleAvail = async (item: MenuItem) => {
    try {
      await api.put(`/menu/items/${item._id}`, { isAvailable: !item.isAvailable });
      setItems((p) => p.map((i) => i._id === item._id ? { ...i, isAvailable: !i.isAvailable } : i));
    } catch { toast.error('Update failed'); }
  };

  const openNewCat = () => { setEditCat(null); setCatForm(EMPTY_CAT); setCatModal(true); };
  const openEditCat = (cat: Category) => {
    setEditCat(cat); setCatForm({ name: cat.name, icon: cat.icon ?? '', description: '', sortOrder: String(cat.sortOrder) }); setCatModal(true);
  };

  const saveCat = async () => {
    if (!catForm.name) return toast.error('Name is required');
    setSaving(true);
    try {
      const payload = { ...catForm, sortOrder: parseInt(catForm.sortOrder) };
      if (editCat) { await api.put(`/menu/categories/${editCat._id}`, payload); toast.success('Category updated'); }
      else         { await api.post('/menu/categories', payload); toast.success('Category created'); }
      setCatModal(false); loadCats();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const deleteCat = async (id: string) => {
    if (!confirm('Deactivate this category?')) return;
    try { await api.delete(`/menu/categories/${id}`); loadCats(); toast.success('Category deactivated'); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Menu</h1>
        <button onClick={tab === 'items' ? openNewItem : openNewCat} className="btn-primary gap-2 text-sm">
          <Plus size={16} /> {tab === 'items' ? 'New Item' : 'New Category'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-arena-800 rounded-xl p-1 w-fit">
        {(['items', 'categories'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === t ? 'bg-white dark:bg-arena-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300')}>
            {t === 'items' ? `Items (${items.length})` : `Categories (${cats.length})`}
          </button>
        ))}
      </div>

      {tab === 'items' && (
        <>
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white dark:bg-arena-800 border border-gray-100 dark:border-arena-700 rounded-xl px-3 py-2 flex-1 min-w-48">
              <Search size={15} className="text-gray-400 shrink-0" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items…"
                className="bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none flex-1" />
            </div>
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
              className="bg-white dark:bg-arena-800 border border-gray-100 dark:border-arena-700 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300 outline-none">
              <option value="">All Categories</option>
              {cats.map((c) => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
            </select>
          </div>

          <div className="card overflow-hidden p-0 overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead><tr className="border-b border-gray-100 dark:border-arena-700 text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left px-5 py-3.5">Item</th>
                <th className="text-left px-4 py-3.5 hidden md:table-cell">Category</th>
                <th className="text-right px-4 py-3.5">Price</th>
                <th className="text-center px-4 py-3.5 hidden sm:table-cell">XP</th>
                <th className="text-center px-4 py-3.5">Available</th>
                <th className="text-center px-4 py-3.5 hidden sm:table-cell">Secret</th>
                <th className="px-4 py-3.5"></th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50 dark:divide-arena-700/50">
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-5 py-3"><div className="skeleton h-6 rounded w-full" /></td></tr>
                )) : items.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-arena-800/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{item.name}</div>
                      <div className="text-xs text-gray-400 truncate max-w-48">{item.description}</div>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{(item.category as any)?.icon} {(item.category as any)?.name ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-sm text-gray-900 dark:text-gray-100">{formatCurrency(item.price)}</td>
                    <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                      <span className="text-xs font-medium text-brand-500">+{item.xpReward}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button onClick={() => toggleAvail(item)}>
                        {item.isAvailable ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} className="text-gray-400" />}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                      {item.isSecret && <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 px-2 py-0.5 rounded-full">Lv{item.requiredLevel}+</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEditItem(item)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-arena-700 text-gray-400 hover:text-brand-500 transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => deleteItem(item._id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && items.length === 0 && (
                  <tr><td colSpan={7} className="py-16 text-center text-gray-400">No items found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'categories' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cats.map((cat) => (
            <motion.div key={cat._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="card p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{cat.icon || '🍽️'}</span>
                <div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">{cat.name}</div>
                  <div className="text-xs text-gray-400">/{cat.slug}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEditCat(cat)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-arena-700 text-gray-400 hover:text-brand-500 transition-colors"><Edit2 size={14} /></button>
                <button onClick={() => deleteCat(cat._id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
              </div>
            </motion.div>
          ))}
          {cats.length === 0 && <div className="col-span-full py-12 text-center text-gray-400">No categories yet</div>}
        </div>
      )}

      {/* Item Modal */}
      <AnimatePresence>
        {itemModal && (
          <Modal title={editItem ? 'Edit Item' : 'New Menu Item'} onClose={() => setItemModal(false)}>
            <div className="space-y-4">
              <Field label="Name *"><input className="input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Spicy Chicken Burger" /></Field>
              <Field label="Description"><textarea className="input resize-none h-20" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Short description…" /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Price *"><input type="number" step="0.01" min="0" className="input" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} placeholder="12.99" /></Field>
                <Field label="Category *">
                  <select className="input" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                    <option value="">Select…</option>
                    {cats.map((c) => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="XP Reward"><input type="number" min="0" className="input" value={form.xpReward} onChange={(e) => setForm((p) => ({ ...p, xpReward: e.target.value }))} /></Field>
                <Field label="Required Level"><input type="number" min="1" className="input" value={form.requiredLevel} onChange={(e) => setForm((p) => ({ ...p, requiredLevel: e.target.value }))} /></Field>
              </div>
              <Field label="Tags (comma-separated)"><input className="input" value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} placeholder="spicy, popular, vegan" /></Field>
              <Field label="Image URL"><input className="input" value={form.image} onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))} placeholder="https://…" /></Field>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm((p) => ({ ...p, isAvailable: e.target.checked }))} className="w-4 h-4 rounded accent-brand-500" />
                  <span className="text-gray-700 dark:text-gray-300">Available</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isSecret} onChange={(e) => setForm((p) => ({ ...p, isSecret: e.target.checked }))} className="w-4 h-4 rounded accent-brand-500" />
                  <span className="text-gray-700 dark:text-gray-300">Secret item</span>
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setItemModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={saveItem} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : editItem ? 'Save Changes' : 'Create Item'}</button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Category Modal */}
      <AnimatePresence>
        {catModal && (
          <Modal title={editCat ? 'Edit Category' : 'New Category'} onClose={() => setCatModal(false)}>
            <div className="space-y-4">
              <Field label="Name *"><input className="input" value={catForm.name} onChange={(e) => setCatForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Burgers" /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Icon (emoji)"><input className="input text-2xl" value={catForm.icon} onChange={(e) => setCatForm((p) => ({ ...p, icon: e.target.value }))} placeholder="🍔" /></Field>
                <Field label="Sort Order"><input type="number" min="0" className="input" value={catForm.sortOrder} onChange={(e) => setCatForm((p) => ({ ...p, sortOrder: e.target.value }))} /></Field>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setCatModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={saveCat} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : editCat ? 'Save Changes' : 'Create Category'}</button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-arena-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-arena-700 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-arena-700 text-gray-400"><X size={18} /></button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}
