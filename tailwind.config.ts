import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // toggled by adding 'dark' class to <html>
  theme: {
    extend: {
      colors: {
        // ── Brand palette ──────────────────────────────────────────
        brand: {
          50:  '#fff5ed',
          100: '#ffe6cc',
          200: '#ffcc99',
          300: '#ffa855',
          400: '#ff7c1f',
          500: '#ff6b35', // primary
          600: '#e55a2b',
          700: '#c44a21',
          800: '#9e3a1a',
          900: '#7a2d14',
        },
        // ── Gold (XP / rewards) ────────────────────────────────────
        gold: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // ── Arena (dark UI accent) ─────────────────────────────────
        arena: {
          900: '#0f0f1a',
          800: '#1a1a2e',
          700: '#16213e',
          600: '#0f3460',
          500: '#533483',
        },
      },
      fontFamily: {
        sans:    ['var(--font-inter)', 'sans-serif'],
        display: ['var(--font-orbitron)', 'sans-serif'], // gamified headings
      },
      animation: {
        'spin-wheel':     'spin 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)',
        'pulse-glow':     'pulseGlow 2s ease-in-out infinite',
        'slide-up':       'slideUp 0.3s ease-out',
        'bounce-in':      'bounceIn 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
        'xp-fill':        'xpFill 1s ease-out',
        'float':          'float 3s ease-in-out infinite',
        'shimmer':        'shimmer 1.5s infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(255, 107, 53, 0.5)' },
          '50%':      { boxShadow: '0 0 20px rgba(255, 107, 53, 0.8), 0 0 40px rgba(255, 107, 53, 0.4)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        bounceIn: {
          '0%':   { transform: 'scale(0.3)', opacity: '0' },
          '50%':  { transform: 'scale(1.05)' },
          '70%':  { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        xpFill: {
          from: { width: '0%' },
          to:   { width: 'var(--xp-width)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'arena-gradient':  'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f3460 100%)',
        'brand-gradient':  'linear-gradient(135deg, #ff6b35 0%, #e55a2b 100%)',
        'gold-gradient':   'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
        'shimmer-gradient':'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
