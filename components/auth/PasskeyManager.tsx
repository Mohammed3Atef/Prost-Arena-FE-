'use client';

import { useEffect, useState } from 'react';
import { Fingerprint, Plus, Trash2, ShieldCheck } from 'lucide-react';
import api from '../../services/api/client';
import toast from 'react-hot-toast';
import { useConfirm } from '../ui/ConfirmProvider';
import { useLocale } from '../layout/LocaleProvider';

interface Credential {
  credentialID: string;
  label:        string;
  transports:   string[];
  createdAt:    string;
}

const PASSKEY_HINT_KEY = 'pa-passkey-hint';

export default function PasskeyManager() {
  const { t } = useLocale();
  const confirm = useConfirm();
  const [list, setList]       = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSupported(typeof PublicKeyCredential !== 'undefined');
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/webauthn/credentials');
      setList(data.data ?? []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  async function addDevice() {
    setBusy(true);
    try {
      const { startRegistration } = await import('@simplewebauthn/browser');
      const { data: opts } = await api.post('/auth/webauthn/register-options', {});
      const label = guessLabel();
      const attestationResponse = await startRegistration({ optionsJSON: opts.data });
      const { data } = await api.post('/auth/webauthn/register-verify', { attestationResponse, label });

      // Remember the credential id on this device so the login page can offer biometric.
      if (data?.data?.credentialID) {
        localStorage.setItem(PASSKEY_HINT_KEY, data.data.credentialID);
      }
      toast.success('Device saved for biometric sign-in');
      refresh();
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') return; // user cancelled
      toast.error(err?.response?.data?.message || err?.message || 'Could not save this device');
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Credential) {
    const ok = await confirm({
      title:        'Remove this device?',
      description:  `${c.label} won't be able to sign in with biometric anymore.`,
      confirmLabel: t('common.delete'),
      tone:         'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/auth/webauthn/credentials/${encodeURIComponent(c.credentialID)}`);
      // Clear the hint if it points to this credential.
      if (typeof window !== 'undefined' && localStorage.getItem(PASSKEY_HINT_KEY) === c.credentialID) {
        localStorage.removeItem(PASSKEY_HINT_KEY);
      }
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to remove');
    }
  }

  if (!supported) {
    return (
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
          <Fingerprint size={18} className="text-brand-500" /> Biometric sign-in
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your browser doesn't support passkeys. Try Chrome, Safari, or Firefox on a recent device.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Fingerprint size={18} className="text-brand-500" /> Biometric sign-in
        </h2>
        <button
          onClick={addDevice}
          disabled={busy}
          className="text-xs text-brand-500 hover:text-brand-600 font-semibold flex items-center gap-1 disabled:opacity-50"
        >
          <Plus size={13} /> Add this device
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Sign in with Face ID, fingerprint, or Windows Hello on devices you've trusted.
      </p>

      {loading ? (
        <div className="space-y-2">
          <div className="skeleton h-12 rounded-xl" />
          <div className="skeleton h-12 rounded-xl" />
        </div>
      ) : list.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          No devices saved yet. Add this device to enable biometric sign-in.
        </p>
      ) : (
        <div className="space-y-2">
          {list.map((c) => (
            <div key={c.credentialID} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-arena-700/50 border border-gray-100 dark:border-arena-700">
              <ShieldCheck size={16} className="text-brand-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{c.label}</p>
                <p className="text-xs text-gray-500">
                  Added {new Date(c.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => remove(c)}
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Try to give the credential a friendly label so the user can tell devices apart.
 * Falls back to "Device" if userAgent isn't useful.
 */
function guessLabel(): string {
  if (typeof navigator === 'undefined') return 'Device';
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua))  return 'iPhone';
  if (/iPad/.test(ua))    return 'iPad';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Android/.test(ua)) return 'Android phone';
  if (/Windows/.test(ua)) return 'Windows PC';
  return 'Device';
}
