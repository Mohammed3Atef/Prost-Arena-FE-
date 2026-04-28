'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { PublicSiteSettings } from '../../lib/server/settings';
import { deriveShades } from '../../lib/colorShades';

interface SiteSettingsContextValue {
  settings:       PublicSiteSettings;
  refresh:        () => Promise<void>;
  applyLocally:   (patch: Partial<PublicSiteSettings>) => void;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | null>(null);

function applyThemeVars(brandColor: string, goldColor: string) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const brand = deriveShades(brandColor);
  const gold  = deriveShades(goldColor);
  ([50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const).forEach((k) => {
    root.style.setProperty(`--brand-${k}`, brand[k]);
    root.style.setProperty(`--gold-${k}`,  gold[k]);
  });
}

export function SiteSettingsProvider({
  initial,
  children,
}: {
  initial: PublicSiteSettings;
  children: ReactNode;
}) {
  const [settings, setSettings] = useState<PublicSiteSettings>(initial);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      const next = (json?.data ?? json) as PublicSiteSettings;
      setSettings(next);
      applyThemeVars(next.brandColor, next.goldColor);
    } catch { /* keep stale */ }
  }, []);

  const applyLocally = useCallback((patch: Partial<PublicSiteSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (patch.brandColor || patch.goldColor) {
        applyThemeVars(next.brandColor, next.goldColor);
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, refresh, applyLocally }), [settings, refresh, applyLocally]);

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings() {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx) throw new Error('useSiteSettings must be used inside <SiteSettingsProvider>');
  return ctx;
}
