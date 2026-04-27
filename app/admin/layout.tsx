/**
 * Admin Layout — responsive sidebar + header shell.
 * Desktop: persistent sidebar on the left.
 * Mobile/Tablet: collapsible sidebar with hamburger toggle.
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Utensils, Trophy, Gift, Users, ChevronRight,
  BarChart3, Layers, ShoppingBag, Target, Menu, X,
} from 'lucide-react';
import ThemeToggle from '../../components/ui/ThemeToggle';
import { useAuthStore } from '../../store/useAuthStore';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '../../lib/utils';

const LINKS = [
  { href: '/admin',            label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/admin/orders',     label: 'Orders',      icon: ShoppingBag },
  { href: '/admin/menu',       label: 'Menu',        icon: Utensils },
  { href: '/admin/challenges', label: 'Challenges',  icon: Trophy },
  { href: '/admin/missions',   label: 'Missions',    icon: Target },
  { href: '/admin/rewards',    label: 'Rewards',     icon: Gift },
  { href: '/admin/spinwheel',  label: 'Spin Wheel',  icon: Layers },
  { href: '/admin/users',      label: 'Users',       icon: Users },
  { href: '/admin/analytics',  label: 'Analytics',   icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const router   = useRouter();
  const { isHydrated } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.push('/login?from=/admin');
    } else if (!['admin', 'superadmin'].includes(user.role)) {
      router.push('/home');
    }
  }, [user, isHydrated]);

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (!isHydrated || !user || !['admin', 'superadmin'].includes(user.role)) {
    return null;
  }

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-gray-100 dark:border-arena-700 flex items-center justify-between">
        <span className="font-display font-bold text-base text-gradient">🏟️ PROST ADMIN</span>
        {/* Close button on mobile only */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-arena-700 text-gray-500"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === '/admin' ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-arena-700',
              )}
            >
              <Icon size={17} />
              {label}
              {active && <ChevronRight size={14} className="ml-auto opacity-70" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 dark:border-arena-700 flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{user?.name}</p>
          <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
        </div>
        <ThemeToggle compact />
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-arena-900">

      {/* ── Desktop Sidebar (lg+) ─────────────────────────────────────── */}
      <aside className="hidden lg:flex w-60 xl:w-64 shrink-0 bg-white dark:bg-arena-800 border-r border-gray-100 dark:border-arena-700 flex-col sticky top-0 h-screen overflow-hidden">
        <SidebarContent />
      </aside>

      {/* ── Mobile Sidebar Overlay ────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Mobile Sidebar Drawer ─────────────────────────────────────── */}
      <aside className={cn(
        'fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-arena-800 border-r border-gray-100 dark:border-arena-700 flex flex-col transition-transform duration-300 lg:hidden',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <SidebarContent />
      </aside>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-auto">

        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-white dark:bg-arena-800 border-b border-gray-100 dark:border-arena-700">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-arena-700 text-gray-600 dark:text-gray-400"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <span className="font-display font-bold text-gradient text-sm">🏟️ PROST ADMIN</span>
          <div className="ml-auto"><ThemeToggle compact /></div>
        </div>

        <main className="p-4 sm:p-6 lg:p-8 flex-1">{children}</main>
      </div>
    </div>
  );
}
