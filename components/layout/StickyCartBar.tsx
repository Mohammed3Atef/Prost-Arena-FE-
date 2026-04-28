'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { useLocale } from './LocaleProvider';
import { formatCurrency } from '../../lib/utils';

const HIDDEN_PREFIXES = ['/cart', '/admin', '/login', '/register'];

export default function StickyCartBar() {
  const pathname  = usePathname();
  const { itemCount: getItemCount, subtotal: getSubtotal, isReady } = useCart();
  const { t, locale } = useLocale();

  if (!isReady) return null;
  const itemCount = getItemCount();
  if (itemCount === 0) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p))) return null;
  const subtotal = getSubtotal();

  return (
    <AnimatePresence>
      <motion.div
        key="sticky-cart"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden px-3 pb-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <Link
          href="/cart"
          className="flex items-center gap-3 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl shadow-lg px-4 py-3"
        >
          <div className="relative">
            <ShoppingBag size={22} />
            <span className="absolute -top-1 -end-1 w-5 h-5 flex items-center justify-center bg-white text-brand-500 text-xs font-bold rounded-full">
              {itemCount > 9 ? '9+' : itemCount}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">{t('cart.viewCart')}</p>
            <p className="text-xs opacity-90 leading-tight">
              {t(itemCount > 1 ? 'cart.itemsInCart' : 'cart.itemInCart', { count: itemCount })} · {formatCurrency(subtotal, locale)}
            </p>
          </div>
          <ArrowRight size={18} className="rtl:rotate-180" />
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}
