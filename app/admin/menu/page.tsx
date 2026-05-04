'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react';
import api from '../../../services/api/client';
import { formatCurrency, cn } from '../../../lib/utils';
import toast from 'react-hot-toast';
import { useConfirm } from '../../../components/ui/ConfirmProvider';

interface Category { _id: string; name: string; icon: string | null; slug: string; isActive: boolean; }
interface MenuItem  {
  _id: string; name: string; description: string; longDescription?: string;
  price: number; category: any; isAvailable: boolean; isSecret: boolean;
  xpReward: number; tags: string[]; ingredients?: string[]; requiredLevel: number;
  image: string | null; gallery?: string[];
  calories?: number | null;
  nutrition?: { protein: number | null; carbs: number | null; fat: number | null };
}

const EMPTY_ITEM = {
  name: '', description: '', longDescription: '',
  price: '', category: '', xpReward: '10', requiredLevel: '1',
  tags: '', ingredients: '', isSecret: false, isAvailable: true,
  image: '', gallery: '',
  calories: '', protein: '', carbs: '', fat: '',
};
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
  const confirm = useConfirm();

  const loadItems = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { limit: '100' };
    if (search)    params.search   = search;
    if (filterCat) params.category = filterCat;
    try { const { data } = await api.get('/menu/items/all', { params }); setItems(data.data ?? []); }
    catch { setItems([]); } finally { setLoading(false); }
  }, [search, filterCat]);

  const loadCats = useCallback(async () => {
    const { data } = await api.get('/menu/categories/all').catch(() => ({ data: { data: [] } }));
    setCats(data.data ?? []);
  }, []);

  useEffect(() => { loadItems(); loadCats(); }, [loadItems, loadCats]);

  const openNewItem = () => { setEditItem(null); setForm(EMPTY_ITEM); setItemModal(true); };
  const openEditItem = (item: MenuItem) => {
    setEditItem(item);
    setForm({
      name:        item.name,
      description: item.description,
      longDescription: item.longDescription ?? '',
      price:       String(item.price),
      category:    item.category?._id ?? item.category ?? '',
      xpReward:    String(item.xpReward),
      requiredLevel: String(item.requiredLevel),
      tags:        item.tags?.join(', ') ?? '',
      ingredients: item.ingredients?.join(', ') ?? '',
      isSecret:    item.isSecret,
      isAvailable: item.isAvailable,
      image:       item.image ?? '',
      gallery:     item.gallery?.join('\n') ?? '',
      calories:    item.calories != null ? String(item.calories) : '',
      protein:     item.nutrition?.protein != null ? String(item.nutrition.protein) : '',
      carbs:       item.nutrition?.carbs   != null ? String(item.nutrition.carbs)   : '',
      fat:         item.nutrition?.fat     != null ? String(item.nutrition.fat)     : '',
    });
    setItemModal(true);
  };

  const saveItem = async () => {
    if (!form.name || !form.price || !form.category) { toast.error('Name, price and category are required'); return; }
    setSaving(true);
    try {
      const numOrNull = (s: string) => s.trim() === '' ? null : Number(s);
      const payload = {
        name:            form.name,
        description:     form.description,
        longDescription: form.longDescription,
        price:           parseFloat(form.price),
        category:        form.category,
        xpReward:        parseInt(form.xpReward),
        requiredLevel:   parseInt(form.requiredLevel),
        tags:            form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        ingredients:     form.ingredients.split(',').map((i) => i.trim()).filter(Boolean),
        isSecret:        form.isSecret,
        isAvailable:     form.isAvailable,
        image:           form.image,
        gallery:         form.gallery.split('\n').map((u) => u.trim()).filter(Boolean),
        calories:        numOrNull(form.calories),
        nutrition: {
          protein: numOrNull(form.protein),
          carbs:   numOrNull(form.carbs),
          fat:     numOrNull(form.fat),
        },
      };
      if (editItem) { await api.put(`/menu/items/${editItem._id}`, payload); toast.success('Item updated'); }
      else          { await api.post('/menu/items', payload); toast.success('Item created'); }
      setItemModal(false); loadItems();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const deleteItem = async (id: string) => {
    const ok = await confirm({
      title: 'Delete menu item?',
      description: 'This item will be removed from the menu permanently.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
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
    setEditCat(cat); setCatForm({ name: cat.name, icon: cat.icon ?? '', description: '', sortOrder: '0' }); setCatModal(true);
  };

  const saveCat = async () => {
    if (!catForm.name) { toast.error('Category name is required'); return; }
    setSaving(true);
    try {
      if (editCat) { await api.put(`/menu/categories/${editCat._id}`, catForm); toast.success('Category updated'); }
      else         { await api.post('/menu/categories', catForm); toast.success('Category created'); }
      setCatModal(false); loadCats();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const deleteCat = async (id: string) => {
    const ok = await confirm({
      title: 'Delete category?',
      description: 'Items linked to this category will need a new home.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try { await api.delete(`/menu/categories/${id}`); setCats((p) => p.filter((c) => c._id !== id)); toast.success('Deleted'); }
    catch { toast.error('Delete failed'); }
  };

  const F = (key: keyof typeof EMPTY_ITEM) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value })),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Menu Management</h1>
        <button onClick={tab === 'items' ? openNewItem : openNewCat} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
          <Plus size={15} /> New {tab === 'items' ? 'Item' : 'Category'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 dark:bg-arena-800 p-1 rounded-xl w-fit">
        {(['items', 'categories'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all',
              tab === t ? 'bg-white dark:bg-arena-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400')}>
            {t}
          </button>
        ))}
      </div>

      {/* Items tab */}
      {tab === 'items' && (
        <>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items…" className="input pl-9 w-full" />
            </div>
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="input w-full sm:w-44">
              <option value="">All Categories</option>
              {cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-arena-800 animate-pulse" />)}</div>
          ) : (
            <div className="card overflow-hidden divide-y divide-gray-50 dark:divide-arena-700">
              {items.length === 0 ? <div className="py-10 text-center text-gray-400">No items found</div> : items.map((item) => (
                <div key={item._id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{item.name}
                      {item.isSecret && <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 px-1.5 py-0.5 rounded-md">Secret</span>}
                    </p>
                    <p className="text-xs text-gray-500">{formatCurrency(item.price)} · +{item.xpReward} XP · Lvl {item.requiredLevel}</p>
                  </div>
                  <button onClick={() => toggleAvail(item)} className={cn('text-xs px-2 py-1 rounded-lg font-medium', item.isAvailable ? 'bg-green-100 dark:bg-green-900/20 text-green-600' : 'bg-gray-100 dark:bg-arena-700 text-gray-500')}>
                    {item.isAvailable ? 'Available' : 'Hidden'}
                  </button>
                  <button onClick={() => openEditItem(item)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-arena-700 rounded-lg"><Edit2 size={14} /></button>
                  <button onClick={() => deleteItem(item._id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-400"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Categories tab */}
      {tab === 'categories' && (
        <div className="card overflow-hidden divide-y divide-gray-50 dark:divide-arena-700">
          {cats.length === 0 ? <div className="py-10 text-center text-gray-400">No categories yet</div> : cats.map((cat) => (
            <div key={cat._id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-2xl">{cat.icon || '📁'}</span>
              <div className="flex-1"><p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{cat.name}</p></div>
              <button onClick={() => openEditCat(cat)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-arena-700 rounded-lg"><Edit2 size={14} /></button>
              <button onClick={() => deleteCat(cat._id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-400"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Item modal */}
      {itemModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-arena-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{editItem ? 'Edit' : 'New'} Menu Item</h2>
              <button onClick={() => setItemModal(false)}><X size={20} /></button>
            </div>
            <input {...F('name')} placeholder="Item name" className="input w-full" />
            <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Description" rows={2} className="input w-full resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <input {...F('price')} type="number" placeholder="Price (EGP)" className="input" />
              <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="input">
                <option value="">Select category</option>
                {cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
              <input {...F('xpReward')} type="number" placeholder="XP reward" className="input" />
              <input {...F('requiredLevel')} type="number" placeholder="Required level" className="input" />
            </div>
            <input {...F('image')} placeholder="Primary image URL" className="input w-full" />
            <input {...F('tags')} placeholder="Tags (comma-separated)" className="input w-full" />
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm((p) => ({ ...p, isAvailable: e.target.checked }))} />
                Available
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isSecret} onChange={(e) => setForm((p) => ({ ...p, isSecret: e.target.checked }))} />
                Secret item
              </label>
            </div>

            {/* Detail page content */}
            <div className="border-t border-gray-100 dark:border-arena-700 pt-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Detail page content</p>
              <textarea value={form.longDescription} onChange={(e) => setForm((p) => ({ ...p, longDescription: e.target.value }))}
                placeholder="Long description / story (shown on item detail page)" rows={3} className="input w-full resize-none" />
              <textarea value={form.gallery} onChange={(e) => setForm((p) => ({ ...p, gallery: e.target.value }))}
                placeholder="Gallery image URLs — one per line" rows={3} className="input w-full resize-none font-mono text-xs" />
              <input {...F('ingredients')} placeholder="Ingredients (comma-separated)" className="input w-full" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <input {...F('calories')} type="number" placeholder="Calories" className="input" />
                <input {...F('protein')}  type="number" placeholder="Protein (g)" className="input" />
                <input {...F('carbs')}    type="number" placeholder="Carbs (g)" className="input" />
                <input {...F('fat')}      type="number" placeholder="Fat (g)" className="input" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setItemModal(false)} className="flex-1 border border-gray-200 dark:border-arena-600 rounded-xl py-2.5 text-sm font-semibold">Cancel</button>
              <button onClick={saveItem} disabled={saving} className="flex-1 btn-primary py-2.5 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Category modal */}
      {catModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-arena-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{editCat ? 'Edit' : 'New'} Category</h2>
              <button onClick={() => setCatModal(false)}><X size={20} /></button>
            </div>
            <input value={catForm.name} onChange={(e) => setCatForm((p) => ({ ...p, name: e.target.value }))} placeholder="Category name" className="input w-full" />
            <input value={catForm.icon} onChange={(e) => setCatForm((p) => ({ ...p, icon: e.target.value }))} placeholder="Icon emoji (optional)" className="input w-full" />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setCatModal(false)} className="flex-1 border border-gray-200 dark:border-arena-600 rounded-xl py-2.5 text-sm font-semibold">Cancel</button>
              <button onClick={saveCat} disabled={saving} className="flex-1 btn-primary py-2.5 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
