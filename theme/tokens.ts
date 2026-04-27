/**
 * Design tokens — single source of truth for colours, spacing, and typography.
 * Used by both TailwindCSS config and the runtime theme provider.
 */

export const colors = {
  brand:    '#ff6b35',
  brandDark:'#e55a2b',
  gold:     '#f59e0b',
  arena:    '#1a1a2e',

  // Light mode
  light: {
    bg:        '#ffffff',
    bgSecondary: '#f8f7f4',
    bgCard:    '#ffffff',
    text:      '#1a1a2e',
    textMuted: '#6b7280',
    border:    '#e5e7eb',
    shadow:    'rgba(0,0,0,0.08)',
  },

  // Dark mode
  dark: {
    bg:        '#0f0f1a',
    bgSecondary: '#1a1a2e',
    bgCard:    '#16213e',
    text:      '#f1f5f9',
    textMuted: '#94a3b8',
    border:    '#2d3748',
    shadow:    'rgba(0,0,0,0.4)',
  },
};

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
};

export const radii = {
  sm:   '0.375rem',
  md:   '0.5rem',
  lg:   '0.75rem',
  xl:   '1rem',
  full: '9999px',
};

export const fontSizes = {
  xs:   '0.75rem',
  sm:   '0.875rem',
  base: '1rem',
  lg:   '1.125rem',
  xl:   '1.25rem',
  '2xl':'1.5rem',
  '3xl':'1.875rem',
  '4xl':'2.25rem',
};
