"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useAuthStore } from "../../../store/useAuthStore";
import toast from "react-hot-toast";
import { useLocale } from "../../../components/layout/LocaleProvider";
import { useSiteSettings } from "../../../components/layout/SiteSettingsProvider";
import GoogleAuthButton from "../../../components/auth/GoogleAuthButton";
import { FieldFloat } from "../../../components/ui/FieldFloat";

function EmailForm() {
  const { register: registerUser, isLoading } = useAuthStore();
  const { t } = useLocale();
  const router = useRouter();
  const sp = useSearchParams();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    referralCode: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = t("auth.nameTooShort");
    if (!form.email.includes("@")) e.email = t("auth.validEmail");
    if (form.password.length < 8) e.password = t("auth.passwordTooShort");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await registerUser({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        referralCode: form.referralCode || undefined,
      });
      toast.success(t("auth.accountCreated"));
      const from = sp?.get("from");
      router.replace(from || "/home");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("auth.registerFailed"));
    }
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value })),
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <FieldFloat label={t("auth.fullName")}>
          <input
            type="text"
            placeholder={t("auth.fullNamePlaceholder")}
            className="input"
            {...field("name")}
          />
        </FieldFloat>
        {errors.name && (
          <p className="text-red-500 text-xs mt-1">{errors.name}</p>
        )}
      </div>
      <div>
        <FieldFloat label={t("auth.email")}>
          <input
            type="email"
            placeholder={t("auth.emailPlaceholder")}
            className="input"
            autoCapitalize="none"
            {...field("email")}
          />
        </FieldFloat>
        {errors.email && (
          <p className="text-red-500 text-xs mt-1">{errors.email}</p>
        )}
      </div>
      <div>
        <FieldFloat label={t("auth.password")}>
          <input
            type={showPw ? "text" : "password"}
            placeholder={t("auth.passwordPlaceholder")}
            className="input pe-11"
            {...field("password")}
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </FieldFloat>
        {errors.password && (
          <p className="text-red-500 text-xs mt-1">{errors.password}</p>
        )}
      </div>
      <div>
        <FieldFloat label={`${t("auth.referralCode")} — ${t("auth.optional")}`}>
          <input
            type="text"
            placeholder={t("auth.referralPlaceholder")}
            className="input uppercase"
            {...field("referralCode")}
          />
        </FieldFloat>
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
            {t("auth.creatingAccount")}
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <UserPlus size={18} />
            {t("auth.registerCta")}
          </span>
        )}
      </motion.button>
    </form>
  );
}

export default function RegisterPage() {
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
            {t("auth.joinArena")}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            {t("auth.createAndEarn")}
          </p>

          <div className="space-y-4">
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
          {t("auth.haveAccount")}{" "}
          <Link
            href="/login"
            className="text-brand-500 font-semibold hover:underline"
          >
            {t("auth.signInLink")}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
