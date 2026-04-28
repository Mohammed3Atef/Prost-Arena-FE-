'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import MenuItemCard from '../../../components/food/MenuItemCard';
import api from '../../../services/api/client';
import { cn } from '../../../lib/utils';
import { useLocale } from '../../../components/layout/LocaleProvider';

interface Category { _id: string; name: string; slug: string; icon: string | null; }
interface MenuItem {
  _id: string; name: string; description: string; image: string | null;
  price: number; xpReward: number; isSecret: boolean; requiredLevel: number;
  tags: string[]; rating: number; isAvailable: boolean;
}

export default function MenuPage() {
  const { t } = useLocale();
  const [categories,      setCategories]      = useState<Category[]>([]);
  const [items,           setItems]           = useState<MenuItem[]>([]);
  const [activeCategory,  setActiveCategory]  = useState('all');
  const [search,          setSearch]          = useState('');
  const [loading,         setLoading]         = useState(true);
  const [hasMore,         setHasMore]         = useState(false);
  const [page,            setPage]            = useState(1);
  const [loadingMore,     setLoadingMore]     = useState(false);

  useEffect(() => {
    api.get('/menu/categories').then((r) => setCategories(r.data.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    const params: Record<string, string> = { limit: '24', page: '1' };
    if (activeCategory !== 'all') params.category = activeCategory;
    if (search) params.search = search;
    api.get('/menu/items', { params })
      .then((r) => { setItems(r.data.data ?? []); setHasMore(r.data.pagination?.hasNext ?? false); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [activeCategory, search]);

  const loadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    const params: Record<string, string> = { limit: '24', page: String(nextPage) };
    if (activeCategory !== 'all') params.category = activeCategory;
    if (search) params.search = search;
    try {
      const { data } = await api.get('/menu/items', { params });
      setItems((p) => [...p, ...(data.data ?? [])]);
      setHasMore(data.pagination?.hasNext ?? false);
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">{t('menu.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('menu.subtitle')}</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input type="text" placeholder={t('menu.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="input ps-10" />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button onClick={() => setActiveCategory('all')}
          className={cn('px-4 py-2 rounded-xl text-sm font-medium shrink-0 transition-all',
            activeCategory === 'all' ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-arena-700 text-gray-700 dark:text-gray-300')}>
          {t('menu.allItems')}
        </button>
        {categories.map((c) => (
          <button key={c._id} onClick={() => setActiveCategory(c._id)}
            className={cn('px-4 py-2 rounded-xl text-sm font-medium shrink-0 transition-all flex items-center gap-1.5',
              activeCategory === c._id ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-arena-700 text-gray-700 dark:text-gray-300')}>
            {c.icon && <span>{c.icon}</span>}{c.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-56 sm:h-72 rounded-2xl bg-gray-100 dark:bg-arena-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={activeCategory + search} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {items.length === 0 ? (
              <div className="col-span-full text-center py-16 text-gray-400">
                <div className="text-6xl mb-4">🍽️</div>
                <p className="text-lg font-medium">{t('menu.noItems')}</p>
              </div>
            ) : (
              items.map((item, i) => (
                <motion.div key={item._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <MenuItemCard item={item} />
                </motion.div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <div className="text-center pt-4">
          <button onClick={loadMore} disabled={loadingMore}
            className="btn-primary px-8 py-3 disabled:opacity-50">
            {loadingMore ? t('common.loading') : t('menu.loadMore')}
          </button>
        </div>
      )}
    </div>
  );
}
