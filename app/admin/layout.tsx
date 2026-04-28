'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Utensils, Trophy, Gift, Users,
  BarChart3, Layers, ShoppingBag, Target, Menu, X, Settings, LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { LocaleProvider } from '../../components/layout/LocaleProvider';
import { LOCALE_COOKIE, LOCALE_DIR, isLocale, DEFAULT_LOCALE } from '../../lib/i18n/config';
import { ThemeProvider } from '../../theme/ThemeProvider';
import ThemeToggle from '../../components/ui/ThemeToggle';

const LINKS = [
  { href: '/admin',            label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/admin/orders',     label: 'Orders',     icon: ShoppingBag },
  { href: '/admin/menu',       label: 'Menu',       icon: Utensils },
  { href: '/admin/challenges', label: 'Challenges', icon: Trophy },
  { href: '/admin/missions',   label: 'Missions',   icon: Target },
  { href: '/admin/rewards',    label: 'Rewards',    icon: Gift },
  { href: '/admin/spinwheel',  label: 'Spin Wheel', icon: Layers },
  { href: '/admin/users',      label: 'Users',      icon: Users },
  { href: '/admin/analytics',  label: 'Analytics',  icon: BarChart3 },
  { href: '/admin/settings',   label: 'Settings',   icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname       = usePathname();
  const router         = useRouter();
  const { user, isHydrated, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // The admin login page is itself rendered under this layout (it's a child
  // of /admin), so don't redirect-loop on /admin/login.
  const isLoginRoute = pathname === '/admin/login';

  useEffect(() => {
    if (!isHydrated) return;
    if (isLoginRoute) return;
    if (!user) { router.push('/admin/login'); return; }
    if (!['admin', 'superadmin'].includes(user.role)) router.push('/admin/login?denied=1');
  }, [user, isHydrated, isLoginRoute]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Force LTR + English on admin regardless of user locale; restore on unmount.
  useEffect(() => {
    const html = document.documentElement;
    html.lang = 'en';
    html.dir  = 'ltr';
    return () => {
      const cookieLocale = document.cookie
        .split('; ')
        .find((c) => c.startsWith(`${LOCALE_COOKIE}=`))
        ?.split('=')[1];
      const next = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
      html.lang = next;
      html.dir  = LOCALE_DIR[next];
    };
  }, []);

  // Render the login page bare (no sidebar/header) under the admin theme scope.
  if (isLoginRoute) {
    return (
      <ThemeProvider storageKey="pa-theme-admin">
        <LocaleProvider initial="en">
          {children}
        </LocaleProvider>
      </ThemeProvider>
    );
  }

  if (!isHydrated || !user || !['admin', 'superadmin'].includes(user.role)) return null;

  const NavLinks = () => (
    <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === '/admin' ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href}
            className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              active
                ? 'bg-brand-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-arena-700 hover:text-gray-900 dark:hover:text-gray-100')}>
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <ThemeProvider storageKey="pa-theme-admin">
    <LocaleProvider initial="en">
    <div className="min-h-screen bg-gray-50 dark:bg-arena-900 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 h-full w-64 bg-white dark:bg-arena-800 border-r border-gray-100 dark:border-arena-700 flex flex-col z-30 transition-transform duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0 lg:static lg:z-auto',
      )}>
        <div className="p-5 border-b border-gray-100 dark:border-arena-700 flex items-center justify-between">
          <span className="font-bold text-base text-brand-500">🏟️ PROST ADMIN</span>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-arena-700">
            <X size={18} />
          </button>
        </div>
        <NavLinks />
        <div className="p-4 border-t border-gray-100 dark:border-arena-700">
          <p className="text-xs text-gray-400 truncate">{user.name}</p>
          <p className="text-xs text-brand-500 font-semibold capitalize">{user.role}</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white dark:bg-arena-800 border-b border-gray-100 dark:border-arena-700 flex items-center px-4 gap-3 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-arena-700">
            <Menu size={20} />
          </button>
          <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm capitalize">
            {LINKS.find((l) => (l.href === '/admin' ? pathname === l.href : pathname.startsWith(l.href)))?.label ?? 'Admin'}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle compact />
            <button
              onClick={() => { logout(); router.push('/admin/login'); }}
              className="btn-ghost p-2"
              title="Log out"
            >
              <LogOut size={16} />
            </button>
            <Link href="/home" className="text-xs text-gray-400 hover:text-brand-500 transition-colors ml-2">← Back to site</Link>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
    </LocaleProvider>
    </ThemeProvider>
  );
}
