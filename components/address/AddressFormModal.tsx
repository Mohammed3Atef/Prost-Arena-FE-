'use client';

import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useLocale } from '../layout/LocaleProvider';
import { useSiteSettings } from '../layout/SiteSettingsProvider';

export interface AddressFormValue {
  _id?:      string;
  label:     string;
  street:    string;
  building?: string;
  apt?:      string;
  city:      string;
  notes?:    string;
  isDefault?: boolean;
}

interface Props {
  open:    boolean;
  onClose: () => void;
  onSubmit: (value: AddressFormValue) => Promise<void> | void;
  initial?: AddressFormValue | null;
  saving?: boolean;
}

const EMPTY: AddressFormValue = {
  label: 'Home', street: '', building: '', apt: '', city: '', notes: '', isDefault: false,
};

export default function AddressFormModal({ open, onClose, onSubmit, initial, saving }: Props) {
  const { t } = useLocale();
  const { settings } = useSiteSettings();
  const [form, setForm] = useState<AddressFormValue>(EMPTY);

  // Show all admin-defined cities. (Active/hidden toggle was removed in admin UI;
  // any defined city is intended for customer use until the admin deletes it.)
  const cities = settings.deliveryCities ?? [];

  useEffect(() => {
    if (open) {
      const seed = initial ? { ...EMPTY, ...initial } : EMPTY;
      // Pre-select the first city if creating new and a city list exists.
      if (!seed.city && cities.length > 0) seed.city = cities[0].name;
      setForm(seed);
    }
  }, [open, initial]);

  const set = (patch: Partial<AddressFormValue>) => setForm((p) => ({ ...p, ...patch }));

  const handleSubmit = async () => {
    if (!form.street.trim() || !form.city.trim()) return;
    await onSubmit(form);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => { if (!o) onClose(); }}
      title={initial?._id ? t('common.edit') : t('profile.addAddress')}
      size="md"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-arena-700 transition-colors">
            {t('common.cancel')}
          </button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50">
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <input
          className="input w-full"
          placeholder={t('profile.addressLabel')}
          value={form.label}
          onChange={(e) => set({ label: e.target.value })}
        />
        <input
          className="input w-full"
          placeholder={t('profile.street')}
          value={form.street}
          onChange={(e) => set({ street: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            className="input"
            placeholder={t('profile.buildingApt')}
            value={`${form.building ?? ''}${form.apt ? ' / ' + form.apt : ''}`}
            onChange={(e) => {
              const [b, a] = e.target.value.split('/').map((s) => s.trim());
              set({ building: b ?? '', apt: a ?? '' });
            }}
          />
          {cities.length > 0 ? (
            <select
              className="input"
              value={form.city}
              onChange={(e) => set({ city: e.target.value })}
            >
              <option value="" disabled>{t('profile.city')}</option>
              {cities.map((c: any) => (
                <option key={c._id ?? c.name} value={c.name}>
                  {c.name} {c.fee > 0 ? `(+${c.fee} EGP)` : ''}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="input"
              placeholder={t('profile.city')}
              value={form.city}
              onChange={(e) => set({ city: e.target.value })}
            />
          )}
        </div>
        <textarea
          className="input w-full min-h-[60px]"
          placeholder={t('profile.addressNotes')}
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
        />
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={!!form.isDefault}
            onChange={(e) => set({ isDefault: e.target.checked })}
          />
          {t('profile.setDefault')}
        </label>
      </div>
    </Modal>
  );
}
