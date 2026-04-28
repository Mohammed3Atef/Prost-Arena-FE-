'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, LogIn, Menu, X, ShoppingBag, LayoutDashboard } from 'lucide-react';
import { useState, useEffect } from 'react';
import ThemeToggle from '../ui/ThemeToggle';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import { useAuthStore } from '../../store/useAuthStore';
import { useCart } from '../../hooks/useCart';
import { useLocale } from './LocaleProvider';
import { cn } from '../../lib/utils';

const NAV_LINKS = [
  { href: '/menu',        labelKey: 'nav.menu' },
  { href: '/challenges',  labelKey: 'nav.challenges' },
  { href: '/leaderboard', labelKey: 'nav.leaderboard' },
  { href: '/spin',        labelKey: 'nav.spin' },
];

export default function Navbar() {
  const pathname         = usePathname();
  const { user, isHydrated } = useAuthStore();
  const { itemCount: getItemCount, isReady: cartReady } = useCart();
  const { t } = useLocale();
  const [open, setOpen]  = useState(false);

  // Hide cart count until cart loaded to avoid hydration mismatch.
  const effectiveUser = isHydrated ? user : null;
  const itemCount     = cartReady ? getItemCount() : 0;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 dark:border-arena-700 bg-white/80 dark:bg-arena-900/80 backdrop-blur-md">
      <div className="container-app">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">🏟️</span>
            <span className="font-display font-bold text-base sm:text-xl text-gradient">
              PROST ARENA
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, labelKey }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
                  pathname === href
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-arena-700',
                )}
              >
                {t(labelKey)}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Language + Theme: desktop only; on mobile they live in the drawer */}
            <div className="hidden md:flex items-center gap-2">
              <LanguageSwitcher compact />
              <ThemeToggle compact />
            </div>

            {/* Orders (logged in) — desktop only */}
            {effectiveUser && (
              <Link href="/orders" className={cn('btn-ghost p-2 hidden md:flex', pathname.startsWith('/orders') && 'text-brand-500')}>
                <ShoppingBag size={20} />
              </Link>
            )}

            {/* Cart — visible always */}
            <Link href="/cart" className="relative btn-ghost p-2">
              <ShoppingCart size={20} />
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span key="badge" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    className="absolute -top-0.5 -end-0.5 w-5 h-5 flex items-center justify-center bg-brand-500 text-white text-xs font-bold rounded-full">
                    {itemCount > 9 ? '9+' : itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            {/* User / Login — desktop only; mobile users access profile from drawer */}
            {effectiveUser ? (
              <div className="hidden sm:flex items-center gap-1">
                {['admin','superadmin'].includes(effectiveUser.role) && (
                  <Link href="/admin" className="btn-ghost p-2" title="Admin Panel">
                    <LayoutDashboard size={18} />
                  </Link>
                )}
                <Link href="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-arena-700 hover:bg-gray-200 dark:hover:bg-arena-600 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-brand-gradient flex items-center justify-center text-white text-xs font-bold">
                    {effectiveUser.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-none">{effectiveUser.name?.split(' ')[0]}</span>
                    <span className="text-xs text-brand-500 leading-none">Lv.{effectiveUser.level}</span>
                  </div>
                </Link>
              </div>
            ) : (
              <Link href="/login" className="btn-primary py-2 px-4 text-sm hidden sm:flex">
                <LogIn size={16} />
                {t('nav.login')}
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden btn-ghost p-2"
              aria-label="Toggle menu"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu — absolute overlay; doesn't push page content */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            className="md:hidden fixed inset-0 top-16 z-40 bg-black/30"
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden absolute top-full inset-x-0 z-50 border-t border-gray-100 dark:border-arena-700 bg-white dark:bg-arena-900 px-4 pb-4 pt-2 space-y-1 shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto"
          >
          {effectiveUser && (
            <Link href="/profile" onClick={() => setOpen(false)}
              className="flex items-center gap-3 mt-2 px-3 py-3 rounded-xl bg-gray-50 dark:bg-arena-700">
              <div className="w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center text-white text-sm font-bold">
                {effectiveUser.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{effectiveUser.name}</span>
                <span className="text-xs text-brand-500">Lv.{effectiveUser.level}</span>
              </div>
            </Link>
          )}

          {NAV_LINKS.map(({ href, labelKey }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className={cn('flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors',
                pathname === href ? 'bg-brand-500 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-arena-700')}>
              {t(labelKey)}
            </Link>
          ))}
          {effectiveUser && (
            <Link href="/orders" onClick={() => setOpen(false)}
              className={cn('flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors',
                pathname.startsWith('/orders') ? 'bg-brand-500 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-arena-700')}>
              {t('nav.orders')}
            </Link>
          )}
          {effectiveUser && ['admin','superadmin'].includes(effectiveUser.role) && (
            <Link href="/admin" onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors">
              {t('nav.admin')}
            </Link>
          )}
          {!effectiveUser && (
            <Link href="/login" onClick={() => setOpen(false)} className="btn-primary mt-2 w-full justify-center">
              {t('nav.login')}
            </Link>
          )}

          {/* Language + theme controls — moved out of the cramped top bar */}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-100 dark:border-arena-700">
            <span className="text-xs text-gray-400 ms-2">{t('common.language')}</span>
            <div className="flex items-center gap-1">
              <LanguageSwitcher compact />
              <ThemeToggle compact />
            </div>
          </div>
          </motion.div>
        </>
      )}
    </header>
  );
}
