'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, LogIn, Menu, X, ShoppingBag, LayoutDashboard } from 'lucide-react';
import { useState, useEffect } from 'react';
import ThemeToggle from '../ui/ThemeToggle';
import { useAuthStore } from '../../store/useAuthStore';
import { useCartStore } from '../../store/useCartStore';
import { cn } from '../../lib/utils';

const NAV_LINKS = [
  { href: '/menu',        label: 'Menu'        },
  { href: '/challenges',  label: 'Challenges'  },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/spin',        label: 'Spin'        },
];

export default function Navbar() {
  const pathname         = usePathname();
  const { user, isHydrated } = useAuthStore();
  const rawItemCount     = useCartStore((s) => s.itemCount());
  const [open, setOpen]  = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Use server-matching values until the client has rehydrated from localStorage.
  // This prevents the React hydration mismatch error.
  const effectiveUser      = isHydrated ? user : null;
  const itemCount          = mounted ? rawItemCount : 0;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 dark:border-arena-700 bg-white/80 dark:bg-arena-900/80 backdrop-blur-md">
      <div className="container-app">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🏟️</span>
            <span className="font-display font-bold text-xl text-gradient">
              PROST ARENA
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => (
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
                {label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle compact />

            {/* Orders (logged in) */}
            {effectiveUser && (
              <Link href="/orders" className={cn('btn-ghost p-2 hidden sm:flex', pathname.startsWith('/orders') && 'text-brand-500')}>
                <ShoppingBag size={20} />
              </Link>
            )}

            {/* Cart */}
            <Link href="/cart" className="relative btn-ghost p-2">
              <ShoppingCart size={20} />
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span key="badge" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    className="absolute -top-0.5 -right-0.5 w-5 h-5 flex items-center justify-center bg-brand-500 text-white text-xs font-bold rounded-full">
                    {itemCount > 9 ? '9+' : itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            {/* User / Login */}
            {effectiveUser ? (
              <div className="flex items-center gap-1">
                {['admin','superadmin'].includes(effectiveUser.role) && (
                  <Link href="/admin" className="btn-ghost p-2 hidden sm:flex" title="Admin Panel">
                    <LayoutDashboard size={18} />
                  </Link>
                )}
                <Link href="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-arena-700 hover:bg-gray-200 dark:hover:bg-arena-600 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-brand-gradient flex items-center justify-center text-white text-xs font-bold">
                    {effectiveUser.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:flex flex-col">
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-none">{effectiveUser.name?.split(' ')[0]}</span>
                    <span className="text-xs text-brand-500 leading-none">Lv.{effectiveUser.level}</span>
                  </div>
                </Link>
              </div>
            ) : (
              <Link href="/login" className="btn-primary py-2 px-4 text-sm hidden sm:flex">
                <LogIn size={16} />
                Login
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

      {/* Mobile menu */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="md:hidden border-t border-gray-100 dark:border-arena-700 bg-white dark:bg-arena-900 px-4 pb-4"
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className={cn('flex items-center gap-3 px-4 py-3 rounded-xl mt-1 font-medium transition-colors',
                pathname === href ? 'bg-brand-500 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-arena-700')}>
              {label}
            </Link>
          ))}
          {effectiveUser && (
            <Link href="/orders" onClick={() => setOpen(false)}
              className={cn('flex items-center gap-3 px-4 py-3 rounded-xl mt-1 font-medium transition-colors',
                pathname.startsWith('/orders') ? 'bg-brand-500 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-arena-700')}>
              My Orders
            </Link>
          )}
          {effectiveUser && ['admin','superadmin'].includes(effectiveUser.role) && (
            <Link href="/admin" onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl mt-1 font-medium text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors">
              Admin Panel
            </Link>
          )}
          {!effectiveUser && (
            <Link href="/login" onClick={() => setOpen(false)} className="btn-primary mt-2 w-full justify-center">
              Login
            </Link>
          )}
        </motion.div>
      )}
    </header>
  );
}
