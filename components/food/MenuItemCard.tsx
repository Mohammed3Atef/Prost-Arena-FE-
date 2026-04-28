'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Lock, Star, Flame, Plus, Minus } from 'lucide-react';
import Image from 'next/image';
import { useCart } from '../../hooks/useCart';
import { useAuthStore } from '../../store/useAuthStore';
import { cn, formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';
import { useLocale } from '../layout/LocaleProvider';

interface MenuItem {
  _id:          string;
  name:         string;
  description:  string;
  image:        string | null;
  price:        number;
  xpReward:     number;
  isSecret:     boolean;
  requiredLevel: number;
  tags:         string[];
  rating:       number;
  isAvailable:  boolean;
}

interface MenuItemCardProps {
  item:      MenuItem;
  className?: string;
}

export default function MenuItemCard({ item, className }: MenuItemCardProps) {
  const { addItem, setQuantity, lineFor } = useCart();
  const cartLine  = lineFor(item._id);
  const user      = useAuthStore((s) => s.user);
  const { t, locale } = useLocale();
  const router    = useRouter();
  const isLocked = item.isSecret && (user?.level ?? 0) < item.requiredLevel;

  const goDetail = () => router.push(`/menu/${item._id}`);
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const handleAdd = async () => {
    if (isLocked) {
      toast.error(t('menu.reachLevel', { level: item.requiredLevel }));
      return;
    }
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
    <motion.div
      whileHover={{ y: -4 }}
      onClick={goDetail}
      className={cn('card overflow-hidden group cursor-pointer', isLocked && 'opacity-75', className)}
    >
      {/* Image */}
      <div className="relative h-32 sm:h-44 bg-gray-100 dark:bg-arena-600 overflow-hidden">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className={cn('object-cover transition-transform duration-500 group-hover:scale-105', isLocked && 'blur-sm')}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🍽️</div>
        )}

        {/* Secret badge */}
        {item.isSecret && (
          <div className="absolute top-2 start-2 badge-gold">
            {isLocked ? <Lock size={10} /> : <Star size={10} />}
            {isLocked ? t('menu.unlockAt', { level: item.requiredLevel }) : t('menu.secretItem')}
          </div>
        )}

        {/* XP badge */}
        <div className="absolute top-2 end-2 badge-brand">
          +{item.xpReward} XP
        </div>

        {/* Popular tag */}
        {item.tags?.includes('popular') && (
          <div className="absolute bottom-2 start-2 flex items-center gap-1 text-xs font-semibold text-white bg-brand-500/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
            <Flame size={10} />
            {t('menu.popular')}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-1 sm:gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 text-sm sm:text-base">{item.name}</h3>
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 text-xs text-gold-500">
            <Star size={11} fill="currentColor" />
            {item.rating > 0 ? item.rating.toFixed(1) : t('menu.new')}
          </div>
        </div>

        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2 sm:mb-3">
          {item.description || t('menu.noDescription')}
        </p>

        {cartLine && !isLocked ? (
          /* In-cart: quantity stepper + "Add item · TOTAL" pill */
          <div className="flex items-center gap-2" onClick={stop}>
            <div className="flex items-center bg-gray-100 dark:bg-arena-700 rounded-xl">
              <button
                onClick={(e) => { e.stopPropagation(); dec(); }}
                aria-label="Decrease"
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-arena-600 rounded-xl transition-colors"
              >
                <Minus size={14} />
              </button>
              <span className="w-6 text-center text-sm font-semibold tabular-nums">{cartLine.quantity}</span>
              <button
                onClick={(e) => { e.stopPropagation(); inc(); }}
                aria-label="Increase"
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-arena-600 rounded-xl transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); inc(); }}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white transition-all min-w-0"
            >
              <ShoppingCart size={12} className="shrink-0" />
              <span className="truncate">{t('menu.addItem')} · {formatCurrency(cartLine.price * cartLine.quantity, locale)}</span>
            </button>
          </div>
        ) : (
          /* Default: price + Add */
          <div className="flex items-center justify-between gap-1">
            <span className="font-bold text-sm sm:text-lg text-gray-900 dark:text-gray-100">
              {formatCurrency(item.price, locale)}
            </span>

            <motion.button
              onClick={(e) => { e.stopPropagation(); handleAdd(); }}
              whileTap={{ scale: 0.9 }}
              disabled={!item.isAvailable || isLocked}
              className={cn(
                'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0',
                isLocked
                  ? 'bg-gray-200 dark:bg-arena-600 text-gray-400 cursor-not-allowed'
                  : 'bg-brand-500 hover:bg-brand-600 text-white',
              )}
            >
              {isLocked ? <Lock size={12} /> : <ShoppingCart size={12} />}
              {isLocked ? t('menu.locked') : t('menu.add')}
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
