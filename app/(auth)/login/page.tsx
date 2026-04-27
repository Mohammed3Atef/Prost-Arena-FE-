'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, LogIn, Mail, Phone, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import api from '../../../services/api/client';
import toast from 'react-hot-toast';
import { cn } from '../../../lib/utils';

/* ─── Email login (original flow) ─────────────────────────────────────────── */
function EmailForm() {
  const { login, isLoading } = useAuthStore();
  const router = useRouter();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email.includes('@'))   e.email    = 'Enter a valid email';
    if (form.password.length < 6)    e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await login(form.email, form.password);
      toast.success('Welcome back! 🏟️');
      const params = new URLSearchParams(window.location.search);
      const from   = params.get('from');
      const { user } = useAuthStore.getState();
      if (from) router.push(from);
      else if (user && ['admin', 'superadmin'].includes(user.role)) router.push('/admin');
      else router.push('/home');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Invalid credentials');
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
        <input type="email" placeholder="you@example.com" className="input"
          value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
        <div className="relative">
          <input type={showPw ? 'text' : 'password'} placeholder="••••••••" className="input pr-11"
            value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
      </div>

      <motion.button type="submit" disabled={isLoading} whileTap={{ scale: 0.98 }} className="btn-primary w-full py-3.5">
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} className="inline-block">⟳</motion.span>
            Signing in…
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2"><LogIn size={18} />Sign In</span>
        )}
      </motion.button>
    </form>
  );
}

/* ─── Phone OTP login ─────────────────────────────────────────────────────── */
type PhaseType = 'phone' | 'otp';

function PhoneForm() {
  const router = useRouter();
  const [phase,     setPhase]     = useState<PhaseType>('phone');
  const [phone,     setPhone]     = useState('');
  const [otp,       setOtp]       = useState('');
  const [sending,   setSending]   = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const startCountdown = () => {
    setCountdown(60);
    const t = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; });
    }, 1000);
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { toast.error('Enter the 6-digit code'); return; }
    setVerifying(true);
    try {
      const { data } = await api.post('/auth/otp/verify', { phone: phone.trim(), otp });
      const result = data.data;

      // Hydrate auth store the same way login/register do
      api.defaults.headers.common['Authorization'] = `Bearer ${result.accessToken}`;
      useAuthStore.setState({ user: result.user, accessToken: result.accessToken });

      toast.success('Welcome back! 🏟️');
      const params = new URLSearchParams(window.location.search);
      const from   = params.get('from');
      if (from) router.push(from);
      else if (result.user?.role && ['admin', 'superadmin'].includes(result.user.role)) router.push('/admin');
      else router.push('/home');
    } catch (err: any) {
      // If no account found, nudge to register
      const msg = err?.response?.data?.message || 'Verification failed';
      if (msg.toLowerCase().includes('name')) {
        toast.error('No account found — please register first');
      } else {
        toast.error(msg);
      }
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    if (countdown > 0) return;
    setSending(true);
    try {
      await api.post('/auth/otp/send', { phone: phone.trim() });
      startCountdown();
      toast.success('New OTP sent!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setSending(false);
    }
  };

  if (phase === 'phone') {
    return (
      <form onSubmit={sendOtp} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone Number</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Phone size={16} /></span>
            <input type="tel" placeholder="+1 555 000 0000" className="input pl-9"
              value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <p className="text-xs text-gray-400 mt-1">Include country code, e.g. +20 for Egypt</p>
        </div>

        <motion.button type="submit" disabled={sending} whileTap={{ scale: 0.98 }} className="btn-primary w-full py-3.5">
          {sending ? (
            <span className="flex items-center justify-center gap-2">
              <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} className="inline-block">⟳</motion.span>
              Sending OTP…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2"><Phone size={18} />Send OTP</span>
          )}
        </motion.button>
      </form>
    );
  }

  return (
    <motion.form onSubmit={verifyOtp} className="space-y-5"
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      <button type="button" onClick={() => setPhase('phone')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-500 transition-colors">
        <ArrowLeft size={15} /> Change number
      </button>

      <div className="text-center py-2">
        <div className="text-4xl mb-2">📱</div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          We sent a 6-digit code to<br />
          <span className="font-semibold text-gray-900 dark:text-gray-100">{phone}</span>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-center">Verification Code</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          placeholder="000000"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="input text-center text-2xl font-mono tracking-[0.5em] py-4"
          autoFocus
        />
      </div>

      <motion.button type="submit" disabled={verifying || otp.length !== 6} whileTap={{ scale: 0.98 }} className="btn-primary w-full py-3.5">
        {verifying ? (
          <span className="flex items-center justify-center gap-2">
            <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} className="inline-block">⟳</motion.span>
            Verifying…
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2"><LogIn size={18} />Sign In</span>
        )}
      </motion.button>

      <div className="text-center">
        <button type="button" onClick={resend} disabled={countdown > 0 || sending}
          className={cn('flex items-center gap-1.5 mx-auto text-sm transition-colors',
            countdown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-brand-500 hover:text-brand-600')}>
          <RefreshCw size={14} />
          {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
        </button>
      </div>
    </motion.form>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
type Tab = 'email' | 'phone';

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('email');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">Welcome back</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Sign in to continue your journey</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 dark:bg-arena-800 p-1 rounded-xl">
        <button onClick={() => setTab('email')}
          className={cn('flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'email'
              ? 'bg-white dark:bg-arena-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700')}>
          <Mail size={15} /> Email
        </button>
        <button onClick={() => setTab('phone')}
          className={cn('flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'phone'
              ? 'bg-white dark:bg-arena-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700')}>
          <Phone size={15} /> Phone
        </button>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {tab === 'email' ? (
          <motion.div key="email" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <EmailForm />
          </motion.div>
        ) : (
          <motion.div key="phone" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <PhoneForm />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        Don't have an account?{' '}
        <Link href="/register" className="text-brand-500 hover:text-brand-600 font-semibold">Create one</Link>
      </div>
    </motion.div>
  );
}
