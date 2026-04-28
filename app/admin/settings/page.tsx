'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Save, Plus, Trash2, GripVertical, Image as ImageIcon, Eye, EyeOff } from 'lucide-react';
import api from '../../../services/api/client';
import toast from 'react-hot-toast';
import { cn } from '../../../lib/utils';
import { useSiteSettings } from '../../../components/layout/SiteSettingsProvider';
import { useConfirm } from '../../../components/ui/ConfirmProvider';

type Tab = 'branding' | 'hero' | 'banners' | 'featured' | 'delivery' | 'rules';

interface MenuItemLite { _id: string; name: string; price: number; image?: string | null; }

const TABS: { key: Tab; label: string }[] = [
  { key: 'branding', label: 'Branding' },
  { key: 'hero',     label: 'Hero' },
  { key: 'banners',  label: 'Banners' },
  { key: 'featured', label: 'Featured Items' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'rules',    label: 'Game Rules' },
];

export default function AdminSettingsPage() {
  const { applyLocally, refresh } = useSiteSettings();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>('branding');
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItemLite[]>([]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/settings');
      setForm(data.data ?? data);
    } catch { toast.error('Failed to load settings'); }
  }, []);

  useEffect(() => {
    load();
    api.get('/menu/items/all', { params: { limit: 200 } })
      .then((r) => setMenuItems(r.data.data ?? []))
      .catch(() => setMenuItems([]));
  }, [load]);

  const update = (patch: any) => setForm((p: any) => ({ ...p, ...patch }));
  const updateNested = (key: string, patch: any) =>
    setForm((p: any) => ({ ...p, [key]: { ...(p[key] ?? {}), ...patch } }));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const payload = {
        appName:       form.appName,
        logoUrl:       form.logoUrl,
        brandColor:    form.brandColor,
        goldColor:     form.goldColor,
        heroBadge:     form.heroBadge,
        heroTitle:     form.heroTitle,
        heroSubtitle:  form.heroSubtitle,
        heroPrimaryCta:   form.heroPrimaryCta,
        heroSecondaryCta: form.heroSecondaryCta,
        featureCards:  form.featureCards,
        banners:       form.banners,
        featuredItems: (form.featuredItems ?? []).map((i: any) => i?._id ?? i),
        dailyChallengeReward: form.dailyChallengeReward,
        xpPerLevelCoeff: form.xpPerLevelCoeff,
        deliveryFee:     form.deliveryFee,
        deliveryCities:  (form.deliveryCities ?? [])
          .filter((c: any) => c.name?.trim())
          .map((c: any) => ({
            ...(c._id && /^[a-f0-9]{24}$/i.test(String(c._id)) ? { _id: c._id } : {}),
            name:     c.name.trim(),
            fee:      Number(c.fee) || 0,
            isActive: true,
          })),
      };
      const { data } = await api.put('/admin/settings', payload);
      const next = data.data ?? data;
      setForm(next);
      applyLocally({
        brandColor: next.brandColor,
        goldColor:  next.goldColor,
        appName:    next.appName,
        logoUrl:    next.logoUrl,
        heroBadge:    next.heroBadge,
        heroTitle:    next.heroTitle,
        heroSubtitle: next.heroSubtitle,
        heroPrimaryCta:   next.heroPrimaryCta,
        heroSecondaryCta: next.heroSecondaryCta,
        featureCards:     next.featureCards,
        banners:          next.banners,
        featuredItems:    next.featuredItems,
        dailyChallengeReward: next.dailyChallengeReward,
        xpPerLevelCoeff:      next.xpPerLevelCoeff,
        deliveryFee:          next.deliveryFee,
        deliveryCities:       next.deliveryCities,
      });
      await refresh();
      toast.success('Settings saved');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Site Settings</h1>
          <p className="text-sm text-gray-400 mt-0.5">Branding, content and game rules — applied site-wide.</p>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary gap-2 text-sm">
          <Save size={16} /> {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <div className="card p-1 inline-flex gap-1 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === t.key
                ? 'bg-brand-500 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-arena-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {tab === 'branding' && (
          <BrandingTab form={form} update={update} />
        )}
        {tab === 'hero' && (
          <HeroTab form={form} update={update} updateNested={updateNested} />
        )}
        {tab === 'banners' && (
          <BannersTab form={form} update={update} confirm={confirm} />
        )}
        {tab === 'featured' && (
          <FeaturedTab form={form} update={update} menuItems={menuItems} />
        )}
        {tab === 'delivery' && (
          <DeliveryTab form={form} update={update} confirm={confirm} />
        )}
        {tab === 'rules' && (
          <RulesTab form={form} update={update} updateNested={updateNested} />
        )}
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────── BRANDING ─────────── */

function BrandingTab({ form, update }: any) {
  return (
    <div className="space-y-6">
      <Section title="App identity">
        <Field label="App name">
          <input className="input" value={form.appName} onChange={(e) => update({ appName: e.target.value })} />
        </Field>
        <Field label="Logo URL">
          <input className="input" value={form.logoUrl} onChange={(e) => update({ logoUrl: e.target.value })} />
          {form.logoUrl && (
            <div className="mt-2 inline-flex p-3 bg-gray-50 dark:bg-arena-800 rounded-xl">
              <img src={form.logoUrl} alt="logo preview" className="h-16 w-auto rounded-md" />
            </div>
          )}
        </Field>
      </Section>

      <Section title="Theme color">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Pick one brand color — the 50–900 shade palette is derived automatically and applied across the site.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ColorField
            label="Brand color"
            value={form.brandColor}
            onChange={(v) => update({ brandColor: v })}
          />
          <ColorField
            label="Gold (XP/rewards)"
            value={form.goldColor}
            onChange={(v) => update({ goldColor: v })}
          />
        </div>
      </Section>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-14 h-12 rounded-xl border border-gray-200 dark:border-arena-600 cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input font-mono text-sm flex-1"
          placeholder="#ff6b35"
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────── HERO ─────────────── */

function HeroTab({ form, update, updateNested }: any) {
  return (
    <div className="space-y-6">
      <Section title="Hero section">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Hero title supports a gradient highlight: wrap a word with <code>{'{{accent:WORD}}'}</code> — e.g. <code>EAT. PLAY. {'{{accent:WIN}}'}.</code>
        </p>
        <Field label="Badge">
          <input className="input" value={form.heroBadge} onChange={(e) => update({ heroBadge: e.target.value })} />
        </Field>
        <Field label="Headline">
          <input className="input font-display" value={form.heroTitle} onChange={(e) => update({ heroTitle: e.target.value })} />
        </Field>
        <Field label="Subheadline">
          <textarea className="input min-h-[80px]" value={form.heroSubtitle} onChange={(e) => update({ heroSubtitle: e.target.value })} />
        </Field>
      </Section>

      <Section title="Primary CTA">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Label">
            <input className="input" value={form.heroPrimaryCta?.label ?? ''} onChange={(e) => updateNested('heroPrimaryCta', { label: e.target.value })} />
          </Field>
          <Field label="URL">
            <input className="input" value={form.heroPrimaryCta?.href ?? ''} onChange={(e) => updateNested('heroPrimaryCta', { href: e.target.value })} />
          </Field>
        </div>
      </Section>

      <Section title="Secondary CTA (logged-out only)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Label">
            <input className="input" value={form.heroSecondaryCta?.label ?? ''} onChange={(e) => updateNested('heroSecondaryCta', { label: e.target.value })} />
          </Field>
          <Field label="URL">
            <input className="input" value={form.heroSecondaryCta?.href ?? ''} onChange={(e) => updateNested('heroSecondaryCta', { href: e.target.value })} />
          </Field>
        </div>
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────── BANNERS ──────────── */

function BannersTab({ form, update, confirm }: any) {
  const banners = form.banners ?? [];
  const setBanners = (next: any[]) => update({ banners: next });

  const addBanner = () => setBanners([
    ...banners,
    { title: 'New banner', subtitle: '', image: '', ctaLabel: 'Learn more', ctaUrl: '#', isActive: true, sortOrder: banners.length },
  ]);

  const removeBanner = async (idx: number) => {
    const ok = await confirm({
      title: 'Remove banner?',
      description: 'It will be removed from the homepage immediately on save.',
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (!ok) return;
    setBanners(banners.filter((_: any, i: number) => i !== idx));
  };

  const updateBanner = (idx: number, patch: any) =>
    setBanners(banners.map((b: any, i: number) => i === idx ? { ...b, ...patch } : b));

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...banners];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    next.forEach((b, i) => (b.sortOrder = i));
    setBanners(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{banners.length} banner{banners.length !== 1 ? 's' : ''}</p>
        <button onClick={addBanner} className="btn-secondary text-xs gap-1.5">
          <Plus size={14} /> Add banner
        </button>
      </div>
      {banners.length === 0 && (
        <div className="card p-8 text-center text-sm text-gray-400">No banners yet. Add one to spotlight a promo on the home page.</div>
      )}
      {banners.map((b: any, idx: number) => (
        <div key={idx} className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={() => move(idx, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-arena-700 disabled:opacity-30">
              <GripVertical size={14} />
            </button>
            <button onClick={() => updateBanner(idx, { isActive: !b.isActive })} className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-700">
              {b.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
              {b.isActive ? 'Active' : 'Hidden'}
            </button>
            <button onClick={() => removeBanner(idx)} className="ml-auto p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Title">
              <input className="input" value={b.title ?? ''} onChange={(e) => updateBanner(idx, { title: e.target.value })} />
            </Field>
            <Field label="Subtitle">
              <input className="input" value={b.subtitle ?? ''} onChange={(e) => updateBanner(idx, { subtitle: e.target.value })} />
            </Field>
            <Field label="Image URL">
              <input className="input" value={b.image ?? ''} onChange={(e) => updateBanner(idx, { image: e.target.value })} placeholder="https://..." />
            </Field>
            <Field label="CTA URL">
              <input className="input" value={b.ctaUrl ?? ''} onChange={(e) => updateBanner(idx, { ctaUrl: e.target.value })} />
            </Field>
            <Field label="CTA label">
              <input className="input" value={b.ctaLabel ?? ''} onChange={(e) => updateBanner(idx, { ctaLabel: e.target.value })} />
            </Field>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────── FEATURED ─────────── */

function FeaturedTab({ form, update, menuItems }: any) {
  const featured: any[] = form.featuredItems ?? [];
  const featuredIds = new Set(featured.map((f) => f?._id ?? f));

  const toggle = (id: string) => {
    if (featuredIds.has(id)) {
      update({ featuredItems: featured.filter((f) => (f?._id ?? f) !== id) });
    } else {
      const item = menuItems.find((m: MenuItemLite) => m._id === id);
      if (item) update({ featuredItems: [...featured, item] });
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Pick items to spotlight on the homepage. <strong>{featured.length}</strong> selected.
      </p>
      {menuItems.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-400">No menu items found. Add items in Menu first.</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {menuItems.map((m: MenuItemLite) => {
            const on = featuredIds.has(m._id);
            return (
              <button
                key={m._id}
                onClick={() => toggle(m._id)}
                className={cn(
                  'card text-left p-3 transition-all relative',
                  on && 'ring-2 ring-brand-500',
                )}
              >
                <div className="aspect-square rounded-xl bg-gray-100 dark:bg-arena-700 overflow-hidden flex items-center justify-center mb-2">
                  {m.image
                    ? <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                    : <ImageIcon size={28} className="text-gray-300" />}
                </div>
                <p className="text-sm font-medium truncate">{m.name}</p>
                <p className="text-xs text-brand-500 font-bold">${m.price.toFixed(2)}</p>
                {on && (
                  <span className="absolute top-2 right-2 bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    FEATURED
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────── DELIVERY ─────────── */

function DeliveryTab({ form, update, confirm }: any) {
  const cities = form.deliveryCities ?? [];
  const setCities = (next: any[]) => update({ deliveryCities: next });

  const addCity = () => setCities([
    ...cities,
    { name: '', fee: 0, isActive: true },
  ]);
  const updateCity = (idx: number, patch: any) =>
    setCities(cities.map((c: any, i: number) => i === idx ? { ...c, ...patch } : c));
  const removeCity = async (idx: number) => {
    const ok = await confirm({
      title: 'Remove this city?',
      description: 'Customers won’t be able to select it for delivery anymore.',
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (!ok) return;
    setCities(cities.filter((_: any, i: number) => i !== idx));
  };

  return (
    <div className="space-y-6">
      <Section title="Default delivery fee">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Used when the customer’s address has no matching city. Set to 0 for free delivery.
        </p>
        <Field label="Default fee (EGP)">
          <input
            type="number"
            className="input"
            value={form.deliveryFee ?? 15}
            min={0}
            step={1}
            onChange={(e) => update({ deliveryFee: Number(e.target.value) || 0 })}
          />
        </Field>
      </Section>

      <Section title="Delivery cities">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {cities.length} {cities.length === 1 ? 'city' : 'cities'}. Customers pick a city when adding a delivery address.
          </p>
          <button onClick={addCity} className="btn-secondary text-xs gap-1.5">
            <Plus size={14} /> Add city
          </button>
        </div>

        {cities.length === 0 ? (
          <div className="card p-8 text-center text-sm text-gray-400">
            No cities yet. Add cities to charge per-city delivery fees.
          </div>
        ) : (
          <div className="space-y-2">
            {cities.map((c: any, idx: number) => (
              <div key={c._id ?? idx} className="card p-3 flex flex-wrap items-center gap-3">
                <input
                  className="input flex-1 min-w-[140px]"
                  placeholder="City name (e.g. Cairo)"
                  value={c.name ?? ''}
                  onChange={(e) => updateCity(idx, { name: e.target.value })}
                />
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400">Fee (EGP)</span>
                  <input
                    type="number"
                    min={0}
                    className="input w-24"
                    value={c.fee ?? 0}
                    onChange={(e) => updateCity(idx, { fee: Number(e.target.value) || 0 })}
                  />
                </div>
                <button
                  onClick={() => removeCity(idx)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────── RULES ────────────── */

function RulesTab({ form, update, updateNested }: any) {
  return (
    <div className="space-y-6">
      <Section title="Daily challenge reward">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          What users earn when they complete the daily quiz challenge.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="XP">
            <input type="number" className="input" value={form.dailyChallengeReward?.xp ?? 0}
              onChange={(e) => updateNested('dailyChallengeReward', { xp: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="Points">
            <input type="number" className="input" value={form.dailyChallengeReward?.points ?? 0}
              onChange={(e) => updateNested('dailyChallengeReward', { points: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="Discount %">
            <input type="number" className="input" value={form.dailyChallengeReward?.discountPct ?? 0}
              onChange={(e) => updateNested('dailyChallengeReward', { discountPct: Number(e.target.value) || 0 })} />
          </Field>
        </div>
      </Section>

      <Section title="Delivery">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Flat delivery fee charged on every delivery order (in EGP). Set to 0 for free delivery.
        </p>
        <Field label="Delivery fee (EGP)">
          <input
            type="number"
            className="input"
            value={form.deliveryFee ?? 15}
            min={0}
            step={1}
            onChange={(e) => update({ deliveryFee: Number(e.target.value) || 0 })}
          />
        </Field>
      </Section>

      <Section title="XP curve">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          XP needed to reach level <em>N</em> = <code>N² × coeff</code>. Lower coeff = faster levelling.
        </p>
        <Field label="XP per level coefficient">
          <input type="number" className="input" value={form.xpPerLevelCoeff ?? 100}
            min={10} step={10}
            onChange={(e) => update({ xpPerLevelCoeff: Number(e.target.value) || 100 })} />
        </Field>
        <div className="text-xs text-gray-500 dark:text-gray-400 grid grid-cols-3 gap-2 mt-2 font-mono">
          {[1, 2, 3, 5, 10, 20].map((n) => (
            <div key={n} className="px-2 py-1 rounded bg-gray-50 dark:bg-arena-700">
              Lv {n} → {(n * n * (form.xpPerLevelCoeff ?? 100)).toLocaleString()} XP
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────── HELPERS ──────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 space-y-4">
      <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-200">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
