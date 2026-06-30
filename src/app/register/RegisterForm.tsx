"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import OtpInput from "@/components/ui/OtpInput";
import {
  HiEnvelope, HiUser, HiShieldCheck, HiCheckCircle, HiArrowLeft,
  HiArrowPath,
} from "react-icons/hi2";
import { useAuthStore } from "@/store/authStore";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Step = "form" | "otp" | "done";

export default function RegisterForm() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [step,      setStep]      = useState<Step>("form");
  const [loading,   setLoading]   = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error,     setError]     = useState("");
  const [cooldown,  setCooldown]  = useState(0);
  const [form, setForm] = useState({ full_name: "", email: "" });

  useEffect(() => {
    if (user) router.replace("/account");
  }, [user, router]);

  // Countdown for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const setF = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setError(""); };

  // Step 1: send OTP
  const sendOtp = async () => {
    if (!form.full_name.trim()) { setError("أدخل اسمك الكامل"); return; }
    if (!form.email.includes("@")) { setError("بريد إلكتروني غير صحيح"); return; }

    setLoading(true); setError("");

    const { error: err } = await supabase.auth.signInWithOtp({
      email: form.email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        data: { full_name: form.full_name.trim() },
        // لا emailRedirectTo — نستخدم رمز OTP فقط، لا روابط
      },
    });

    setLoading(false);
    if (err) {
      setError("تعذّر الإرسال — تحقق من البريد وحاول مجدداً");
    } else {
      setStep("otp");
      setCooldown(60);
    }
  };

  // Step 2: verify OTP
  const verifyOtp = async (code: string) => {
    setVerifying(true); setError("");

    const { error: err } = await supabase.auth.verifyOtp({
      email: form.email.trim().toLowerCase(),
      token: code,
      type:  "signup",
    });

    setVerifying(false);
    if (err) {
      setError("الرمز غير صحيح أو انتهت صلاحيته — أعد المحاولة");
    } else {
      setStep("done");
      setTimeout(() => router.replace("/account"), 1500);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setError("");
    const { error: err } = await supabase.auth.signInWithOtp({
      email: form.email.trim().toLowerCase(),
      options: { shouldCreateUser: true, data: { full_name: form.full_name.trim() } },
    });
    if (!err) setCooldown(60);
    else setError("تعذّر إعادة الإرسال");
  };

  const iCls = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container-main flex min-h-[80vh] items-center justify-center py-12">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-500 text-brand-900 font-bold text-2xl shadow-lg">أ</div>
            <h1 className="text-2xl font-bold text-[var(--text-1)]">
              {step === "done" ? "مرحباً بك! 🎉" : "إنشاء حساب جديد"}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {step === "form" && "سجّل للتسوق وتتبع طلباتك"}
              {step === "otp"  && `أدخل الرمز المُرسل إلى ${form.email}`}
              {step === "done" && "جارٍ تحويلك لحسابك..."}
            </p>
          </div>

          <div className="card-base p-6">

            {/* ── Step: done ── */}
            {step === "done" && (
              <div className="py-10 text-center">
                <HiCheckCircle className="mx-auto mb-4 text-6xl text-green-500" />
                <p className="font-bold text-lg text-[var(--text-1)]">تم إنشاء حسابك بنجاح</p>
                <p className="text-sm text-[var(--text-muted)] mt-2">جارٍ تحويلك...</p>
              </div>
            )}

            {/* ── Step: form ── */}
            {step === "form" && (
              <div className="space-y-4">
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
                    ⚠ {error}
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">الاسم الكامل *</label>
                  <div className="relative">
                    <HiUser className="absolute top-3.5 end-3 text-sm text-[var(--text-muted)]" />
                    <input type="text" placeholder="محمد أحمد"
                      value={form.full_name}
                      onChange={e => setF("full_name", e.target.value)}
                      onKeyDown={e => e.key === "Enter" && sendOtp()}
                      className={`${iCls} pe-9`} autoComplete="name" />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">البريد الإلكتروني *</label>
                  <div className="relative">
                    <HiEnvelope className="absolute top-3.5 end-3 text-sm text-[var(--text-muted)]" />
                    <input type="email" dir="ltr" placeholder="example@gmail.com"
                      value={form.email}
                      onChange={e => setF("email", e.target.value)}
                      onKeyDown={e => e.key === "Enter" && sendOtp()}
                      className={`${iCls} pe-9`} autoComplete="email" />
                  </div>
                </div>

                <button onClick={sendOtp}
                  disabled={loading || !form.full_name || !form.email}
                  className="btn-primary w-full justify-center py-3">
                  {loading
                    ? <><span className="animate-spin inline-block mr-2">⏳</span> جارٍ الإرسال...</>
                    : <>إرسال رمز التأكيد <HiArrowLeft className="text-base" /></>}
                </button>

                <div className="flex items-start gap-2 rounded-xl bg-[var(--bg-page)] border border-[var(--border)] p-3 text-xs text-[var(--text-muted)]">
                  <HiShieldCheck className="shrink-0 text-brand-700 text-base mt-0.5" />
                  ستصلك رسالة تحتوي على رمز مكوّن من 6 أرقام. لا كلمة مرور مطلوبة.
                </div>
              </div>
            )}

            {/* ── Step: otp ── */}
            {step === "otp" && (
              <div className="space-y-6">
                {/* Email display */}
                <div className="flex items-center gap-3 rounded-xl bg-[var(--bg-page)] border border-[var(--border)] px-4 py-3">
                  <HiEnvelope className="text-brand-700 text-lg shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--text-muted)]">تم إرسال الرمز إلى</p>
                    <p className="text-sm font-semibold text-[var(--text-1)] truncate" dir="ltr">{form.email}</p>
                  </div>
                  <button onClick={() => { setStep("form"); setError(""); }}
                    className="text-xs text-brand-700 dark:text-accent-400 hover:underline shrink-0">
                    تغيير
                  </button>
                </div>

                {/* OTP boxes */}
                <div className="space-y-2">
                  <p className="text-center text-sm font-medium text-[var(--text-2)]">أدخل الرمز المكوّن من 6 أرقام</p>
                  <OtpInput
                    length={6}
                    onComplete={verifyOtp}
                    disabled={verifying}
                    autoFocus
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400 text-center">
                    ⚠ {error}
                  </div>
                )}

                {/* Verifying indicator */}
                {verifying && (
                  <p className="text-center text-sm text-[var(--text-muted)]">
                    <span className="animate-spin inline-block mr-1">⏳</span> جارٍ التحقق...
                  </p>
                )}

                {/* Resend */}
                <div className="text-center">
                  {cooldown > 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">
                      إعادة إرسال بعد <span className="font-bold text-brand-700 dark:text-accent-400">{cooldown}</span> ثانية
                    </p>
                  ) : (
                    <button onClick={resend}
                      className="flex items-center gap-1.5 mx-auto text-sm text-brand-700 dark:text-accent-400 hover:underline">
                      <HiArrowPath className="text-base" /> إعادة إرسال الرمز
                    </button>
                  )}
                </div>

                {/* Hint */}
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                  <p className="font-semibold">💡 لم يصلك الرمز؟</p>
                  <p>• تحقق من مجلد <strong>الرسائل غير المرغوب فيها (Spam)</strong></p>
                  <p>• الرمز صالح لمدة <strong>ساعة واحدة</strong></p>
                  <p>• يمكنك إعادة الإرسال بعد انتهاء العداد</p>
                </div>
              </div>
            )}
          </div>

          {step === "form" && (
            <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
              لديك حساب؟{" "}
              <Link href="/login" className="font-medium text-brand-700 hover:text-brand-900 dark:text-accent-400 transition-colors">
                سجّل دخول
              </Link>
            </p>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
