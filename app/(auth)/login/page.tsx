"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn, Fingerprint } from "lucide-react";
import { useAuthStore } from "../../../store/useAuthStore";
import toast from "react-hot-toast";
import { useLocale } from "../../../components/layout/LocaleProvider";
import { useSiteSettings } from "../../../components/layout/SiteSettingsProvider";
import GoogleAuthButton from "../../../components/auth/GoogleAuthButton";

const PASSKEY_HINT_KEY = "pa-passkey-hint";

function EmailForm() {
  const { login, isLoading } = useAuthStore();
  const { t } = useLocale();
  const router = useRouter();
  const sp = useSearchParams();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email.trim()) e.email = t("auth.enterEmail");
    if (!form.password.trim()) e.password = t("auth.enterPassword");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await login(form.email.trim().toLowerCase(), form.password);
      const from = sp?.get("from");
      router.replace(from || "/home");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("auth.invalidCredentials"));
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {t("auth.email")}
        </label>
        <input
          type="email"
          placeholder={t("auth.emailPlaceholder")}
          className="input"
          autoCapitalize="none"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
        />
        {errors.email && (
          <p className="text-red-500 text-xs mt-1">{errors.email}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {t("auth.password")}
        </label>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            placeholder="••••••••"
            className="input pe-11"
            value={form.password}
            onChange={(e) =>
              setForm((p) => ({ ...p, password: e.target.value }))
            }
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && (
          <p className="text-red-500 text-xs mt-1">{errors.password}</p>
        )}
      </div>
      <motion.button
        type="submit"
        disabled={isLoading}
        whileTap={{ scale: 0.98 }}
        className="btn-primary w-full py-3.5"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              className="inline-block"
            >
              ⟳
            </motion.span>
            {t("auth.signingIn")}
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <LogIn size={18} />
            {t("auth.signIn")}
          </span>
        )}
      </motion.button>
    </form>
  );
}

function BiometricButton() {
  const { t } = useLocale();
  const router = useRouter();
  const sp = useSearchParams();
  const [hasHint, setHasHint] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHasHint(!!localStorage.getItem(PASSKEY_HINT_KEY));
  }, []);

  if (!hasHint) return null;

  const handleClick = async () => {
    setBusy(true);
    try {
      // Lazy import to avoid pulling the WebAuthn lib into the initial bundle.
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const api = (await import("../../../services/api/client")).default;

      const credentialIdHint =
        localStorage.getItem(PASSKEY_HINT_KEY) ?? undefined;
      const { data: opts } = await api.post("/auth/webauthn/login-options", {
        credentialIdHint,
      });
      const assertion = await startAuthentication({ optionsJSON: opts.data });
      await useAuthStore.getState().signInWithBiometric(assertion);
      const from = sp?.get("from");
      router.replace(from || "/home");
    } catch (err: any) {
      // User cancelled or no credential matched — silently ignore so they can fall back to other methods.
      if (err?.name !== "NotAllowedError") {
        toast.error(err?.response?.data?.message || t("auth.biometricFailed"));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="w-full py-3 rounded-xl border-2 border-brand-500 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
    >
      <Fingerprint size={18} />
      {t("auth.signInWithBiometric")}
    </button>
  );
}

export default function LoginPage() {
  const { t } = useLocale();
  const { settings } = useSiteSettings();

  return (
    <div className=" bg-gray-50 dark:bg-arena-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white dark:bg-arena-800 rounded-3xl shadow-xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {t("auth.loginTitle")}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            {t("auth.loginSubtitle")}
          </p>

          <div className="space-y-4">
            <BiometricButton />
            <GoogleAuthButton />
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200 dark:bg-arena-700" />
              <span className="text-xs uppercase tracking-wider text-gray-400">
                {t("auth.orContinueWith")}
              </span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-arena-700" />
            </div>
            <EmailForm />
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          {t("auth.noAccount")}{" "}
          <Link
            href="/register"
            className="text-brand-500 font-semibold hover:underline"
          >
            {t("auth.createOne")}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
