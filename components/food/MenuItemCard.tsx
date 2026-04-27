'use client';

import { motion } from 'framer-motion';
import { ShoppingCart, Lock, Star, Flame } from 'lucide-react';
import Image from 'next/image';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import { cn, formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';

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
  const addItem  = useCartStore((s) => s.addItem);
  const user     = useAuthStore((s) => s.user);
  const isLocked = item.isSecret && (user?.level ?? 0) < item.requiredLevel;

  const handleAdd = () => {
    if (isLocked) {
      toast.error(`Reach level ${item.requiredLevel} to unlock this item!`);
      return;
    }
    addItem({
      menuItemId:  item._id,
      name:        item.name,
      price:       item.price,
      quantity:    1,
      addOns:      [],
      specialNote: '',
      image:       item.image,
    });
    toast.success(`${item.name} added to cart!`);
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
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
          <div className="absolute top-2 left-2 badge-gold">
            {isLocked ? <Lock size={10} /> : <Star size={10} />}
            {isLocked ? `Unlock at Lv.${item.requiredLevel}` : 'Secret Item'}
          </div>
        )}

        {/* XP badge */}
        <div className="absolute top-2 right-2 badge-brand">
          +{item.xpReward} XP
        </div>

        {/* Popular tag */}
        {item.tags?.includes('popular') && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs font-semibold text-white bg-brand-500/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
            <Flame size={10} />
            Popular
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-1 sm:gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 text-sm sm:text-base">{item.name}</h3>
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 text-xs text-gold-500">
            <Star size={11} fill="currentColor" />
            {item.rating > 0 ? item.rating.toFixed(1) : 'New'}
          </div>
        </div>

        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2 sm:mb-3">
          {item.description || 'No description available.'}
        </p>

        <div className="flex items-center justify-between gap-1">
          <span className="font-bold text-sm sm:text-lg text-gray-900 dark:text-gray-100">
            {formatCurrency(item.price)}
          </span>

          <motion.button
            onClick={handleAdd}
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
            {isLocked ? 'Locked' : 'Add'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
