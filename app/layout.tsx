import type { Metadata, Viewport } from 'next';
import { Inter, Orbitron } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '../theme/ThemeProvider';
import { ConfirmProvider } from '../components/ui/ConfirmProvider';
import PWARegister from '../components/layout/PWARegister';
import { SiteSettingsProvider } from '../components/layout/SiteSettingsProvider';
import { LocaleProvider } from '../components/layout/LocaleProvider';
import { CartProvider } from '../hooks/useCart';
import { loadServerSettings, buildThemeCssVars } from '../lib/server/settings';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_DIR, isLocale, type Locale } from '../lib/i18n/config';
import './globals.css';

const inter = Inter({
  subsets:  ['latin'],
  variable: '--font-inter',
  display:  'swap',
});

const orbitron = Orbitron({
  subsets:  ['latin'],
  variable: '--font-orbitron',
  display:  'swap',
});

export const metadata: Metadata = {
  title:       'Prost Arena — Eat. Play. Earn.',
  description: 'The gamified food ordering experience. Order, challenge, earn rewards.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  applicationName: 'Prost Arena',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Prost Arena',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-192.png',   sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png',   sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title:       'Prost Arena — Eat. Play. Earn.',
    description: 'Gamified food ordering — level up your appetite.',
    type:        'website',
    images:      [{ url: '/icon-512.png', width: 512, height: 512, alt: 'Prost Arena' }],
  },
};

// Settings are read from the DB per-request so admin changes apply immediately.
export const dynamic = 'force-dynamic';

// themeColor and viewport meta live here in Next.js 14+
export const viewport: Viewport = {
  themeColor: '#ff6b35',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await loadServerSettings();
  const themeCss = buildThemeCssVars(settings);

  // Resolve locale from cookie; fall back to default
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  const dir = LOCALE_DIR[locale];

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        {/* Inject runtime brand-color CSS variables before first paint */}
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
        {/* Inline script to prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('pa-theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (t === 'dark' || ((!t || t === 'system') && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${orbitron.variable} font-sans bg-white dark:bg-arena-900 text-gray-900 dark:text-gray-100 transition-colors duration-300`}>
        <SiteSettingsProvider initial={settings}>
          <LocaleProvider initial={locale}>
            <ThemeProvider>
              <ConfirmProvider>
                <CartProvider>
                  {children}
                  <PWARegister />
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      duration: 4000,
                      style: { borderRadius: '0.75rem', fontFamily: 'var(--font-inter)' },
                    }}
                  />
                </CartProvider>
              </ConfirmProvider>
            </ThemeProvider>
          </LocaleProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
