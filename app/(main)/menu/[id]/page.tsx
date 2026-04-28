'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ShoppingCart, Lock, Star, Plus, Minus, Flame } from 'lucide-react';
import api from '../../../../services/api/client';
import { useCart } from '../../../../hooks/useCart';
import { useAuthStore } from '../../../../store/useAuthStore';
import { useLocale } from '../../../../components/layout/LocaleProvider';
import { cn, formatCurrency } from '../../../../lib/utils';
import toast from 'react-hot-toast';

interface MenuItem {
  _id:          string;
  name:         string;
  description:  string;
  longDescription?: string;
  image:        string | null;
  gallery?:     string[];
  price:        number;
  xpReward:     number;
  isSecret:     boolean;
  requiredLevel: number;
  tags:         string[];
  ingredients?: string[];
  rating:       number;
  isAvailable:  boolean;
  calories?:    number | null;
  nutrition?:   { protein: number | null; carbs: number | null; fat: number | null };
  category?:    { name: string; icon: string | null };
}

export default function MenuItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useLocale();
  const user = useAuthStore((s) => s.user);
  const { addItem, setQuantity, lineFor } = useCart();

  const [item, setItem]       = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [activeImg, setActiveImg] = useState(0);

  const cartLine = id ? lineFor(id) : undefined;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    api.get(`/menu/items/${id}`)
      .then((r) => { if (!cancelled) setItem(r.data.data); })
      .catch((e) => { if (!cancelled) setError(e?.response?.data?.message || t('menu.itemNotFound')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, t]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="skeleton h-72 rounded-3xl" />
        <div className="skeleton h-8 w-2/3 rounded-lg" />
        <div className="skeleton h-4 w-full rounded-lg" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="max-w-md mx-auto card p-12 text-center space-y-3">
        <p className="text-5xl">🍽️</p>
        <p className="font-semibold text-gray-700 dark:text-gray-300">{error || t('menu.itemNotFound')}</p>
        <button onClick={() => router.push('/menu')} className="btn-primary inline-flex">
          <ArrowLeft size={16} className="rtl:rotate-180" /> {t('menu.backToMenu')}
        </button>
      </div>
    );
  }

  const isLocked = item.isSecret && (user?.level ?? 0) < item.requiredLevel;
  const images = (item.gallery && item.gallery.length > 0)
    ? item.gallery
    : (item.image ? [item.image] : []);

  const handleAdd = async () => {
    if (isLocked) { toast.error(t('menu.reachLevel', { level: item.requiredLevel })); return; }
    if (!user) { router.push(`/login?from=/menu/${item._id}`); return; }
    try {
      await addItem({ menuItem: item._id, quantity: 1 });
      if (!cartLine) toast.success(t('menu.addedToCart', { name: item.name }));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to add to cart');
    }
  };
  const dec = async () => {
    if (!cartLine) return;
    try { await setQuantity(cartLine.lineId, cartLine.quantity - 1); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };
  const inc = async () => {
    if (!cartLine) { handleAdd(); return; }
    try { await setQuantity(cartLine.lineId, cartLine.quantity + 1); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 lg:pb-0">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
        <ArrowLeft size={16} className="rtl:rotate-180" /> {t('menu.backToMenu')}
      </button>

      {/* Gallery */}
      <div className="space-y-3">
        <div className="relative aspect-[4/3] sm:aspect-[16/10] rounded-3xl overflow-hidden bg-gray-100 dark:bg-arena-700">
          {images.length > 0 ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={images[activeImg]}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0"
              >
                <Image
                  src={images[activeImg]}
                  alt={item.name}
                  fill
                  className={cn('object-cover', isLocked && 'blur-md')}
                  priority
                />
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-7xl">🍽️</div>
          )}
          {isLocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white">
              <Lock size={28} className="mb-2" />
              <p className="text-sm font-semibold">{t('menu.unlockAt', { level: item.requiredLevel })}</p>
            </div>
          )}
          {item.isSecret && !isLocked && (
            <div className="absolute top-3 start-3 badge-gold">
              <Star size={10} fill="currentColor" /> {t('menu.secretItem')}
            </div>
          )}
          <div className="absolute top-3 end-3 badge-brand">
            +{item.xpReward} XP
          </div>
        </div>

        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {images.map((src, i) => (
              <button
                key={src + i}
                onClick={() => setActiveImg(i)}
                className={cn(
                  'relative h-16 w-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all',
                  activeImg === i ? 'border-brand-500' : 'border-transparent opacity-70 hover:opacity-100',
                )}
              >
                <Image src={src} alt="" fill className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Title block */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">{item.name}</h1>
            {item.category && (
              <p className="text-sm text-gray-500 mt-0.5">{item.category.icon} {item.category.name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-gold-500">
              <Star size={14} fill="currentColor" />
              {item.rating > 0 ? item.rating.toFixed(1) : t('menu.new')}
            </div>
            {item.tags?.includes('popular') && (
              <span className="badge-brand"><Flame size={10} /> {t('menu.popular')}</span>
            )}
          </div>
        </div>
        {item.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
        )}
      </div>

      {/* Long description */}
      {item.longDescription && (
        <div className="card p-5">
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {item.longDescription}
          </p>
        </div>
      )}

      {/* Ingredients */}
      {item.ingredients && item.ingredients.length > 0 && (
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-300">{t('menu.ingredients')}</h2>
          <div className="flex flex-wrap gap-2">
            {item.ingredients.map((i, idx) => (
              <span key={idx} className="text-xs px-3 py-1.5 rounded-full bg-gray-100 dark:bg-arena-700 text-gray-700 dark:text-gray-300">{i}</span>
            ))}
          </div>
        </div>
      )}

      {/* Nutrition */}
      {(item.calories != null ||
        item.nutrition?.protein != null ||
        item.nutrition?.carbs != null ||
        item.nutrition?.fat != null) && (
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-300">{t('menu.nutrition')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <NutriCell label={t('menu.calories')} value={item.calories} unit="kcal" />
            <NutriCell label={t('menu.protein')}  value={item.nutrition?.protein} unit={t('menu.grams')} />
            <NutriCell label={t('menu.carbs')}    value={item.nutrition?.carbs}   unit={t('menu.grams')} />
            <NutriCell label={t('menu.fat')}      value={item.nutrition?.fat}     unit={t('menu.grams')} />
          </div>
        </div>
      )}

      {/* Add-to-cart bar (sticky on mobile, inline on desktop) */}
      <div
        className="
          fixed inset-x-0 bottom-0 z-30 lg:static lg:z-auto
          border-t lg:border-0 border-gray-100 dark:border-arena-700
          bg-white/95 dark:bg-arena-900/95 backdrop-blur lg:bg-transparent
          px-4 py-3 lg:p-0
        "
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-3xl mx-auto">
          {cartLine && !isLocked ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-gray-100 dark:bg-arena-700 rounded-2xl">
                <button onClick={dec} className="w-10 h-10 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-arena-600 rounded-2xl transition-colors">
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center font-semibold tabular-nums">{cartLine.quantity}</span>
                <button onClick={inc} className="w-10 h-10 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-arena-600 rounded-2xl transition-colors">
                  <Plus size={16} />
                </button>
              </div>
              <button onClick={inc} className="flex-1 btn-primary py-3">
                <ShoppingCart size={16} /> {t('menu.addItem')} · {formatCurrency(cartLine.price * cartLine.quantity, locale)}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(item.price, locale)}</div>
              <button
                onClick={handleAdd}
                disabled={!item.isAvailable || isLocked}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold transition-all',
                  isLocked
                    ? 'bg-gray-200 dark:bg-arena-700 text-gray-400 cursor-not-allowed'
                    : 'bg-brand-500 hover:bg-brand-600 text-white',
                )}
              >
                {isLocked ? <Lock size={16} /> : <ShoppingCart size={16} />}
                {isLocked ? t('menu.locked') : t('menu.addToCart')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NutriCell({ label, value, unit }: { label: string; value: number | null | undefined; unit: string }) {
  return (
    <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-arena-700/50">
      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
        {value != null ? `${value}${unit ? '' : ''}` : '—'}
      </p>
      <p className="text-xs text-gray-500">{label}{value != null && unit ? ` (${unit})` : ''}</p>
    </div>
  );
}
