"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import OtpInput from "@/components/ui/OtpInput";
import {
  HiEnvelope, HiShieldCheck, HiCheckCircle, HiArrowLeft, HiArrowPath,
  HiDevicePhoneMobile,
} from "react-icons/hi2";
import { useAuthStore } from "@/store/authStore";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Step = "input" | "otp" | "done";

export default function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirectTo   = searchParams.get("redirectTo") ?? "/account";
  const { user }     = useAuthStore();

  const [step,      setStep]      = useState<Step>("input");
  const [method,    setMethod]    = useState<"email" | "phone">("email");
  const [email,     setEmail]     = useState("");
  const [phone,     setPhone]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error,     setError]     = useState("");
  const [cooldown,  setCooldown]  = useState(0);

  useEffect(() => {
    if (user) router.replace(redirectTo);
  }, [user, router, redirectTo]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendOtp = async () => {
    if (!email.trim() || !email.includes("@")) {
      setError("أدخل بريداً إلكترونياً صحيحاً"); return;
    }
    setLoading(true); setError("");

    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: false,
        // لا emailRedirectTo — رمز OTP فقط، بدون روابط
      },
    });

    setLoading(false);
    if (err) {
      if (err.message.toLowerCase().includes("not found") || err.message.includes("User not found")) {
        setError("هذا البريد غير مسجّل — هل تريد إنشاء حساب جديد؟");
      } else {
        setError("تعذّر الإرسال — تحقق من البريد وحاول مجدداً");
      }
    } else {
      setStep("otp");
      setCooldown(60);
    }
  };

  const verifyOtp = async (code: string) => {
    setVerifying(true); setError("");

    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type:  "email",
    });

    setVerifying(false);
    if (err) {
      setError("الرمز غير صحيح أو انتهت صلاحيته — أعد المحاولة");
    } else {
      setStep("done");
      setTimeout(() => router.replace(redirectTo), 1200);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setError("");
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    });
    if (!err) setCooldown(60);
    else setError("تعذّر إعادة الإرسال");
  };

  const sendPhoneOtp = async () => {
    const p = phone.trim();
    if (p.replace(/\D/g, "").length < 9) { setError("أدخل رقم جوال صحيح"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/auth/phone/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: p }),
    });
    const d = await res.json();
    setLoading(false);
    if (!res.ok) { setError(d.error ?? "تعذّر الإرسال"); return; }
    setStep("otp"); setCooldown(60);
  };

  const verifyPhoneOtp = async (code: string) => {
    setVerifying(true); setError("");
    const res = await fetch("/api/auth/phone/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone.trim(), code }),
    });
    const d = await res.json();
    if (!res.ok || !d.success) {
      setVerifying(false);
      setError(d.error ?? "الرمز غير صحيح");
      return;
    }
    await supabase.auth.setSession({
      access_token:  d.access_token,
      refresh_token: d.refresh_token,
    });
    setVerifying(false);
    setStep("done");
    setTimeout(() => router.replace(redirectTo), 1200);
  };

  const resendPhone = async () => {
    if (cooldown > 0) return;
    setError("");
    const res = await fetch("/api/auth/phone/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone.trim() }),
    });
    if (res.ok) setCooldown(60);
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
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-700 text-white font-bold text-2xl shadow-lg">أ</div>
            <h1 className="text-2xl font-bold text-[var(--text-1)]">
              {step === "done" ? "مرحباً بك!" : "تسجيل الدخول"}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {step === "input" && (method === "email" ? "أدخل بريدك لتلقّي رمز الدخول" : "أدخل رقم جوالك لتلقّي الرمز عبر واتساب")}
              {step === "otp"   && `أدخل الرمز المُرسل إلى ${method === "email" ? email : phone}`}
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

            {/* ── Input email ── */}
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
                    <HiDevicePhoneMobile className="text-sm"/> رقم الجوال (واتساب)
                  </button>
                </div>
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
                    ⚠ {error}
                    {error.includes("غير مسجّل") && (
                      <Link href="/register" className="block mt-1.5 font-medium text-brand-700 dark:text-accent-400 hover:underline">
                        إنشاء حساب جديد ←
                      </Link>
                    )}
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
                        onKeyDown={e => e.key === "Enter" && sendOtp()}
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
                        onKeyDown={e => e.key === "Enter" && sendPhoneOtp()}
                        className={`${iCls} pe-9`}
                        autoComplete="tel" autoFocus />
                    </div>
                  </div>
                )}

                <button onClick={method === "email" ? sendOtp : sendPhoneOtp}
                  disabled={loading || (method === "email" ? !email : !phone)}
                  className="btn-primary w-full justify-center py-3">
                  {loading
                    ? <><span className="animate-spin inline-block mr-2">⏳</span> جارٍ الإرسال...</>
                    : <>إرسال رمز الدخول <HiArrowLeft className="text-base" /></>}
                </button>

                <div className="flex items-start gap-2 rounded-xl bg-[var(--bg-page)] border border-[var(--border)] p-3 text-xs text-[var(--text-muted)]">
                  <HiShieldCheck className="shrink-0 text-brand-700 text-base mt-0.5" />
                  {method === "email"
                    ? "ستصلك رسالة تحتوي على رمز مكوّن من 6 أرقام. لا كلمة مرور مطلوبة."
                    : "سيصلك رمز مكوّن من 6 أرقام عبر واتساب. لا كلمة مرور مطلوبة."}
                </div>
              </div>
            )}

            {/* ── OTP verification ── */}
            {step === "otp" && (
              <div className="space-y-6">
                {/* Email badge */}
                <div className="flex items-center gap-3 rounded-xl bg-[var(--bg-page)] border border-[var(--border)] px-4 py-3">
                  {method === "email"
                    ? <HiEnvelope className="text-brand-700 text-lg shrink-0" />
                    : <HiDevicePhoneMobile className="text-brand-700 text-lg shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--text-muted)]">تم إرسال الرمز إلى</p>
                    <p className="text-sm font-semibold text-[var(--text-1)] truncate" dir="ltr">{method === "email" ? email : phone}</p>
                  </div>
                  <button onClick={() => { setStep("input"); setError(""); }}
                    className="text-xs text-brand-700 dark:text-accent-400 hover:underline shrink-0">
                    تغيير
                  </button>
                </div>

                {/* OTP boxes */}
                <div className="space-y-2">
                  <p className="text-center text-sm font-medium text-[var(--text-2)]">أدخل الرمز المكوّن من 6 أرقام</p>
                  <OtpInput
                    length={6}
                    onComplete={method === "email" ? verifyOtp : verifyPhoneOtp}
                    disabled={verifying}
                    autoFocus
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400 text-center">
                    ⚠ {error}
                  </div>
                )}

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
                    <button onClick={method === "email" ? resend : resendPhone}
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
