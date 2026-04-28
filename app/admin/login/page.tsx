"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn, ShieldAlert } from "lucide-react";
import { useAuthStore } from "../../../store/useAuthStore";
import toast from "react-hot-toast";

function LoginForm() {
  const { login, isLoading, user, isHydrated } = useAuthStore();
  const router = useRouter();
  const sp = useSearchParams();
  const denied = sp?.get("denied") === "1";

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Already-authed admin? Skip to dashboard.
  useEffect(() => {
    if (!isHydrated) return;
    if (user && ["admin", "superadmin"].includes(user.role)) {
      router.replace("/admin");
    }
  }, [user, isHydrated]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.email.trim()) errs.email = "Enter your email";
    if (!form.password.trim()) errs.password = "Enter your password";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      await login(form.email.trim().toLowerCase(), form.password);
      const me = useAuthStore.getState().user;
      if (!me || !["admin", "superadmin"].includes(me.role)) {
        toast.error("This account is not an administrator.");
        useAuthStore.getState().logout();
        return;
      }
      router.replace("/admin");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Invalid credentials");
    }
  };

  return (
    <div className=" bg-gray-50 dark:bg-arena-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <p className="text-5xl mb-3">🛡️</p>
          <h1 className="text-3xl font-black tracking-widest text-gray-900 dark:text-white">
            PROST ADMIN
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Staff sign in
          </p>
        </div>

        {denied && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <span>You don't have permission to access the admin panel.</span>
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="bg-white dark:bg-arena-800 rounded-3xl shadow-xl p-8 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Email
            </label>
            <input
              type="email"
              autoCapitalize="none"
              placeholder="admin@example.com"
              className="input"
              value={form.email}
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Password
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
                  transition={{
                    repeat: Infinity,
                    duration: 0.8,
                    ease: "linear",
                  }}
                >
                  ⟳
                </motion.span>
                Signing in…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <LogIn size={18} />
                Sign In
              </span>
            )}
          </motion.button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Are you a customer?{" "}
          <a href="/login" className="text-brand-500 hover:underline">
            Use the customer login
          </a>
        </p>
      </motion.div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
