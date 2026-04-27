'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn, Mail, Phone } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import api from '../../../services/api/client';
import toast from 'react-hot-toast';

type Tab       = 'email' | 'phone';
type PhaseType = 'phone' | 'otp';

/* ─── Email login ─────────────────────────────────────────────────────────── */
function EmailForm() {
  const { login, isLoading } = useAuthStore();
  const router = useRouter();

  const [form,   setForm]   = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email.trim())    e.email    = 'Enter your email';
    if (!form.password.trim()) e.password = 'Enter your password';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await login(form.email.trim().toLowerCase(), form.password);
      router.push('/home');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Invalid credentials');
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
        <input
          type="email" placeholder="you@example.com" className="input" autoCapitalize="none"
          value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
        />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'} placeholder="••••••••" className="input pr-11"
            value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          />
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
      </div>
      <motion.button type="submit" disabled={isLoading} whileTap={{ scale: 0.98 }} className="btn-primary w-full py-3.5">
        {isLoading
          ? <span className="flex items-center justify-center gap-2"><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} className="inline-block">⟳</motion.span>Signing in…</span>
          : <span className="flex items-center justify-center gap-2"><LogIn size={18} />Sign In</span>}
      </motion.button>
    </form>
  );
}

/* ─── Phone OTP login ─────────────────────────────────────────────────────── */
function PhoneForm() {
  const router = useRouter();

  const [phase,     setPhase]     = useState<PhaseType>('phone');
  const [phone,     setPhone]     = useState('');
  const [otp,       setOtp]       = useState('');
  const [sending,   setSending]   = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = () => {
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    if (!phone.trim()) { toast.error('Enter your phone number'); return; }
    setSending(true);
    try {
      await api.post('/auth/otp/send', { phone: phone.trim() });
      setPhase('otp');
      startCountdown();
      toast.success('OTP sent to your phone!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send OTP');
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { toast.error('Enter the 6-digit code'); return; }
    setVerifying(true);
    try {
      const { data } = await api.post('/auth/otp/verify', { phone: phone.trim(), otp });
      const { accessToken, user } = data.data;
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      useAuthStore.setState({ user, accessToken });
      toast.success(`Welcome back, ${user.name}! 🏟️`);
      if (user.role === 'admin' || user.role === 'superadmin') {
        router.push('/admin');
      } else {
        router.push('/home');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setSending(true);
    try {
      await api.post('/auth/otp/send', { phone: phone.trim() });
      startCountdown();
      toast.success('New OTP sent!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to resend');
    } finally {
      setSending(false);
    }
  };

  if (phase === 'otp') {
    return (
      <div className="space-y-5">
        <button onClick={() => setPhase('phone')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          ← Change number
        </button>
        <div className="text-center py-2">
          <p className="text-4xl mb-2">📱</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            We sent a 6-digit code to{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{phone}</span>
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-center">
            Verification Code
          </label>
          <input
            type="tel" maxLength={6} autoFocus
            className="input text-center text-2xl tracking-widest font-mono py-4"
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </div>
        <motion.button
          onClick={handleVerifyOtp}
          disabled={verifying || otp.length !== 6}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-3.5 rounded-xl font-bold text-white transition-all ${
            otp.length === 6 ? 'bg-brand-500 hover:bg-brand-600' : 'bg-gray-300 dark:bg-arena-700 cursor-not-allowed'
          }`}
        >
          {verifying
            ? <span className="flex items-center justify-center gap-2"><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} className="inline-block">⟳</motion.span>Verifying…</span>
            : 'Sign In'}
        </motion.button>
        <button
          onClick={handleResend}
          disabled={countdown > 0 || sending}
          className={`w-full text-sm text-center ${countdown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-brand-500 hover:underline'}`}
        >
          {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone Number</label>
        <input
          type="tel" placeholder="+1 555 000 0000" className="input"
          value={phone} onChange={(e) => setPhone(e.target.value)}
        />
        <p className="text-xs text-gray-400 mt-1">Include country code, e.g. +20</p>
      </div>
      <motion.button
        onClick={handleSendOtp}
        disabled={sending || !phone.trim()}
        whileTap={{ scale: 0.98 }}
        className="btn-primary w-full py-3.5"
      >
        {sending
          ? <span className="flex items-center justify-center gap-2"><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} className="inline-block">⟳</motion.span>Sending…</span>
          : <span className="flex items-center justify-center gap-2"><Phone size={18} />Send OTP</span>}
      </motion.button>
    </div>
  );
}

/* ─── Page shell ─────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('email');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-arena-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <p className="text-5xl mb-3">🏟️</p>
          <h1 className="text-3xl font-black tracking-widest text-gray-900 dark:text-white">PROST ARENA</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Eat. Play. Win.</p>
        </div>

        <div className="bg-white dark:bg-arena-800 rounded-3xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Welcome back</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Sign in to continue your journey</p>

          {/* Tab switcher */}
          <div className="flex bg-gray-100 dark:bg-arena-900 rounded-xl p-1 mb-6">
            {(['email', 'phone'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t
                    ? 'bg-white dark:bg-arena-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {t === 'email' ? <Mail size={15} /> : <Phone size={15} />}
                {t === 'email' ? 'Email' : 'Phone'}
              </button>
            ))}
          </div>

          {tab === 'email' ? <EmailForm /> : <PhoneForm />}
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-brand-500 font-semibold hover:underline">Create one</Link>
        </p>
      </motion.div>
    </div>
  );
}
