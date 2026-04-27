import type { Metadata, Viewport } from 'next';
import { Inter, Orbitron } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '../theme/ThemeProvider';
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
  title:       'Prost Arena — Eat. Play. Win.',
  description: 'The gamified food ordering experience. Order, challenge, earn rewards.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  icons:       { icon: '/favicon.ico' },
  openGraph: {
    title:       'Prost Arena',
    description: 'Gamified food ordering — level up your appetite.',
    type:        'website',
  },
};

// themeColor lives here in Next.js 14+
export const viewport: Viewport = {
  themeColor: '#ff6b35',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
        <ThemeProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { borderRadius: '0.75rem', fontFamily: 'var(--font-inter)' },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
