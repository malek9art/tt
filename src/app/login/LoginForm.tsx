"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  HiEnvelope, HiCheckCircle, HiArrowLeft,
  HiDevicePhoneMobile, HiEye, HiEyeSlash, HiLockClosed,
} from "react-icons/hi2";
import { useAuthStore } from "@/store/authStore";
import { phoneToVirtualEmail } from "@/lib/auth-validation";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Step = "input" | "done";

export default function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirectTo   = searchParams.get("redirectTo") ?? "/account";
  const { user }     = useAuthStore();

  const [step,      setStep]      = useState<Step>("input");
  const [method,    setMethod]    = useState<"email" | "phone">("email");
  const [email,     setEmail]     = useState("");
  const [phone,     setPhone]     = useState("");
  const [password,  setPassword]  = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  useEffect(() => {
    if (user) router.replace(redirectTo);
  }, [user, router, redirectTo]);

  const login = async () => {
    if (method === "email" && (!email.trim() || !email.includes("@"))) {
      setError("أدخل بريداً إلكترونياً صحيحاً"); return;
    }
    if (method === "phone" && phone.replace(/\D/g, "").length < 9) {
      setError("أدخل رقم جوال صحيح"); return;
    }
    if (!password) { setError("أدخل كلمة المرور"); return; }

    setLoading(true); setError("");

    const identifier = method === "email"
      ? email.trim().toLowerCase()
      : phoneToVirtualEmail(phone.trim());

    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: identifier,
      password,
    });

    setLoading(false);

    if (err || !data.session) {
      setError("البيانات المُدخلة غير صحيحة — تحقق من البريد/الجوال وكلمة المرور");
      return;
    }

    setStep("done");
    setTimeout(() => router.replace(redirectTo), 1200);
  };

  const iCls = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container-main flex min-h-[80vh] items-center justify-center py-12">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-700 text-white font-bold text-2xl shadow-lg">أ</div>
            <h1 className="text-2xl font-bold text-[var(--text-1)]">
              {step === "done" ? "مرحباً بك!" : "تسجيل الدخول"}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {step === "input" && "أدخل بياناتك لتسجيل الدخول"}
              {step === "done"  && "جارٍ تحويلك..."}
            </p>
          </div>

          <div className="card-base p-6">

            {/* ── Done ── */}
            {step === "done" && (
              <div className="py-10 text-center">
                <HiCheckCircle className="mx-auto mb-4 text-6xl text-green-500" />
                <p className="font-bold text-lg text-[var(--text-1)]">تم تسجيل الدخول بنجاح</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">جارٍ تحويلك...</p>
              </div>
            )}

            {/* ── Input ── */}
            {step === "input" && (
              <div className="space-y-4">
                {/* اختيار الطريقة */}
                <div className="flex rounded-xl border border-[var(--border)] overflow-hidden">
                  <button type="button" onClick={() => { setMethod("email"); setError(""); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
                      method === "email" ? "bg-brand-700 text-white" : "bg-[var(--bg-page)] text-[var(--text-2)]"
                    }`}>
                    <HiEnvelope className="text-sm"/> البريد الإلكتروني
                  </button>
                  <button type="button" onClick={() => { setMethod("phone"); setError(""); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
                      method === "phone" ? "bg-brand-700 text-white" : "bg-[var(--bg-page)] text-[var(--text-2)]"
                    }`}>
                    <HiDevicePhoneMobile className="text-sm"/> رقم الجوال
                  </button>
                </div>
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
                    ⚠ {error}
                    <Link href="/register" className="block mt-1.5 font-medium text-brand-700 dark:text-accent-400 hover:underline">
                      إنشاء حساب جديد ←
                    </Link>
                  </div>
                )}

                {method === "email" ? (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">البريد الإلكتروني</label>
                    <div className="relative">
                      <HiEnvelope className="absolute top-3.5 end-3 text-sm text-[var(--text-muted)]" />
                      <input type="email" dir="ltr" placeholder="example@gmail.com"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setError(""); }}
                        className={`${iCls} pe-9`}
                        autoComplete="email" autoFocus />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">رقم الجوال</label>
                    <div className="relative">
                      <HiDevicePhoneMobile className="absolute top-3.5 end-3 text-sm text-[var(--text-muted)]" />
                      <input type="tel" dir="ltr" placeholder="7XXXXXXXX"
                        value={phone}
                        onChange={e => { setPhone(e.target.value); setError(""); }}
                        className={`${iCls} pe-9`}
                        autoComplete="tel" autoFocus />
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">كلمة المرور</label>
                  <div className="relative">
                    <HiLockClosed className="absolute top-3.5 end-3 text-sm text-[var(--text-muted)]" />
                    <input type={showPw ? "text" : "password"} dir="ltr" placeholder="••••••••"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(""); }}
                      onKeyDown={e => e.key === "Enter" && login()}
                      className={`${iCls} pe-9 ps-10`}
                      autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute top-3.5 start-3 text-[var(--text-muted)] hover:text-[var(--text-1)]">
                      {showPw ? <HiEyeSlash/> : <HiEye/>}
                    </button>
                  </div>
                </div>

                <button onClick={login}
                  disabled={loading || (method === "email" ? !email : !phone) || !password}
                  className="btn-primary w-full justify-center py-3">
                  {loading
                    ? <><span className="animate-spin inline-block mr-2">⏳</span> جارٍ الدخول...</>
                    : <>تسجيل الدخول <HiArrowLeft className="text-base" /></>}
                </button>

                <p className="text-center">
                  <Link href="/forgot-password" className="text-xs text-brand-700 dark:text-accent-400 hover:underline">
                    نسيت كلمة المرور؟
                  </Link>
                </p>
              </div>
            )}
          </div>

          {step === "input" && (
            <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
              ليس لديك حساب؟{" "}
              <Link href="/register" className="font-medium text-brand-700 hover:text-brand-900 dark:text-accent-400 transition-colors">
                سجّل الآن
              </Link>
            </p>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
