'use client';

import { useGoogleLogin } from '@react-oauth/google';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/useAuthStore';
import { useLocale } from '../layout/LocaleProvider';

interface Props {
  /** Where to send the user after a successful sign-in. Defaults to /home. */
  defaultRedirect?: string;
}

/**
 * Branded Google sign-in button. Always renders so the auth screen UI is
 * complete; behavior depends on whether NEXT_PUBLIC_GOOGLE_CLIENT_ID is set.
 *
 * - Configured → real OAuth via implicit flow (access_token) + backend verify.
 * - Not configured → click toasts a setup hint (so the dev knows what to do).
 */
export default function GoogleAuthButton(props: Props) {
  const configured = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  return configured ? <ConfiguredButton {...props} /> : <UnconfiguredButton />;
}

function ConfiguredButton({ defaultRedirect = '/home' }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const { signInWithGoogle: storeSignInWithGoogle } = useAuthStore();
  const [busy, setBusy] = useState(false);

  const trigger = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      setBusy(true);
      try {
        await storeSignInWithGoogle(tokenResponse.access_token);
        const from = sp?.get('from');
        router.replace(from || defaultRedirect);
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Google sign-in failed');
      } finally {
        setBusy(false);
      }
    },
    onError: () => toast.error('Google sign-in cancelled'),
  });

  return <Shell busy={busy} onClick={() => trigger()} />;
}

function UnconfiguredButton() {
  const { t } = useLocale();
  return <Shell busy={false} onClick={() => toast.error(t('auth.googleNotConfigured'))} />;
}

function Shell({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-200 dark:border-arena-700 bg-white dark:bg-arena-800 hover:bg-gray-50 dark:hover:bg-arena-700 text-gray-800 dark:text-gray-100 font-semibold transition-colors disabled:opacity-50"
    >
      <GoogleIcon />
      <span>{busy ? '…' : 'Continue with Google'}</span>
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.05-3.71 1.05-2.85 0-5.27-1.92-6.13-4.5H2.18v2.84A11 11 0 0 0 12 23z"/>
      <path fill="#FBBC05" d="M5.87 14.12a6.6 6.6 0 0 1 0-4.24V7.04H2.18a11 11 0 0 0 0 9.92l3.69-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.04l3.69 2.84C6.73 7.3 9.15 5.38 12 5.38z"/>
    </svg>
  );
}
