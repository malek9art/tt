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
  HiArrowPath, HiDevicePhoneMobile, HiEye, HiEyeSlash, HiLockClosed,
} from "react-icons/hi2";
import { useAuthStore } from "@/store/authStore";
import { validatePassword } from "@/lib/auth-validation";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Step = "form" | "otp" | "check-email" | "done";

export default function RegisterForm() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [step,      setStep]      = useState<Step>("form");
  const [loading,   setLoading]   = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error,     setError]     = useState("");
  const [cooldown,  setCooldown]  = useState(0);
  const [method,    setMethod]    = useState<"email" | "phone">("email");
  const [showPw,    setShowPw]    = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "", confirm: "" });
  const [phonePassword, setPhonePassword]        = useState("");
  const [phonePasswordConfirm, setPhonePasswordConfirm] = useState("");

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

  // مسار البريد: إنشاء حساب مباشرة بكلمة مرور + رابط تأكيد
  const signUpEmail = async () => {
    if (!form.full_name.trim()) { setError("أدخل اسمك الكامل"); return; }
    if (!form.email.includes("@")) { setError("بريد إلكتروني غير صحيح"); return; }
    if (form.password !== form.confirm) { setError("كلمتا المرور غير متطابقتين"); return; }
    const pwCheck = validatePassword(form.password);
    if (!pwCheck.valid) { setError(pwCheck.error!); return; }

    setLoading(true); setError("");

    const { data, error: err } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: { data: { full_name: form.full_name.trim() } },
    });

    setLoading(false);

    if (err) {
      setError("تعذّر إنشاء الحساب — حاول مجدداً");
      return;
    }

    // Supabase لا يُرجع خطأً عند وجود البريد مسبقاً (لمنع تعداد البريد) —
    // بدلاً من ذلك يُرجع مستخدماً وهمياً بدون هويات (identities)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError("هذا البريد مسجّل مسبقاً — سجّل الدخول بدلاً من ذلك");
      return;
    }

    setStep("check-email");
  };

  // مسار الجوال: خطوة 1 — إرسال رمز واتساب
  const sendPhoneOtp = async () => {
    if (!form.full_name.trim()) { setError("أدخل اسمك الكامل"); return; }
    if (form.phone.replace(/\D/g, "").length < 9) { setError("أدخل رقم جوال صحيح"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/auth/phone/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: form.phone.trim() }),
    });
    const d = await res.json();
    setLoading(false);
    if (!res.ok) { setError(d.error ?? "تعذّر الإرسال"); return; }
    setStep("otp"); setCooldown(60);
  };

  // مسار الجوال: خطوة 2 — التحقق من الرمز + تفعيل كلمة المرور
  const verifyPhoneOtp = async (code: string) => {
    if (phonePassword !== phonePasswordConfirm) { setError("كلمتا المرور غير متطابقتين"); return; }
    const pwCheck = validatePassword(phonePassword);
    if (!pwCheck.valid) { setError(pwCheck.error!); return; }

    setVerifying(true); setError("");
    const res = await fetch("/api/auth/phone/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: form.phone.trim(),
        code,
        full_name: form.full_name.trim(),
        password: phonePassword,
        mode: "signup",
      }),
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
    setTimeout(() => router.replace("/account"), 1500);
  };

  const resendPhone = async () => {
    if (cooldown > 0) return;
    setError("");
    const res = await fetch("/api/auth/phone/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: form.phone.trim() }),
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
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-500 text-brand-900 font-bold text-2xl shadow-lg">أ</div>
            <h1 className="text-2xl font-bold text-[var(--text-1)]">
              {step === "done" ? "مرحباً بك! 🎉" : "إنشاء حساب جديد"}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {step === "form"        && "سجّل للتسوق وتتبع طلباتك"}
              {step === "otp"         && `أدخل الرمز المُرسل إلى ${form.phone}`}
              {step === "check-email" && "تحقق من بريدك لتفعيل الحساب"}
              {step === "done"        && "جارٍ تحويلك لحسابك..."}
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

            {/* ── Step: check-email ── */}
            {step === "check-email" && (
              <div className="py-8 text-center space-y-3">
                <HiEnvelope className="mx-auto text-6xl text-brand-700" />
                <p className="font-bold text-lg text-[var(--text-1)]">تم إرسال رابط التفعيل</p>
                <p className="text-sm text-[var(--text-muted)]">
                  افتح الرسالة المُرسلة إلى <span className="font-semibold" dir="ltr">{form.email}</span> واضغط على الرابط لتفعيل حسابك.
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  لم تصلك الرسالة؟ تحقق من مجلد الرسائل غير المرغوب فيها (Spam)
                </p>
              </div>
            )}

            {/* ── Step: form ── */}
            {step === "form" && (
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
                    {error.includes("مسجّل مسبقاً") && (
                      <Link href="/login" className="block mt-1.5 font-medium text-brand-700 dark:text-accent-400 hover:underline">
                        تسجيل الدخول ←
                      </Link>
                    )}
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">الاسم الكامل *</label>
                  <div className="relative">
                    <HiUser className="absolute top-3.5 end-3 text-sm text-[var(--text-muted)]" />
                    <input type="text" placeholder="محمد أحمد"
                      value={form.full_name}
                      onChange={e => setF("full_name", e.target.value)}
                      className={`${iCls} pe-9`} autoComplete="name" />
                  </div>
                </div>

                {method === "email" ? (
                  <>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">البريد الإلكتروني *</label>
                      <div className="relative">
                        <HiEnvelope className="absolute top-3.5 end-3 text-sm text-[var(--text-muted)]" />
                        <input type="email" dir="ltr" placeholder="example@gmail.com"
                          value={form.email}
                          onChange={e => setF("email", e.target.value)}
                          className={`${iCls} pe-9`} autoComplete="email" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">كلمة المرور *</label>
                      <div className="relative">
                        <HiLockClosed className="absolute top-3.5 end-3 text-sm text-[var(--text-muted)]" />
                        <input type={showPw ? "text" : "password"} dir="ltr" placeholder="••••••••"
                          value={form.password}
                          onChange={e => setF("password", e.target.value)}
                          className={`${iCls} pe-9 ps-10`} autoComplete="new-password" />
                        <button type="button" onClick={() => setShowPw(!showPw)}
                          className="absolute top-3.5 start-3 text-[var(--text-muted)] hover:text-[var(--text-1)]">
                          {showPw ? <HiEyeSlash/> : <HiEye/>}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">تأكيد كلمة المرور *</label>
                      <input type={showPw ? "text" : "password"} dir="ltr" placeholder="••••••••"
                        value={form.confirm}
                        onChange={e => setF("confirm", e.target.value)}
                        onKeyDown={e => e.key === "Enter" && signUpEmail()}
                        className={iCls} autoComplete="new-password" />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">رقم الجوال *</label>
                    <div className="relative">
                      <HiDevicePhoneMobile className="absolute top-3.5 end-3 text-sm text-[var(--text-muted)]" />
                      <input type="tel" dir="ltr" placeholder="7XXXXXXXX"
                        value={form.phone}
                        onChange={e => setF("phone", e.target.value)}
                        onKeyDown={e => e.key === "Enter" && sendPhoneOtp()}
                        className={`${iCls} pe-9`} autoComplete="tel" />
                    </div>
                  </div>
                )}

                <button onClick={method === "email" ? signUpEmail : sendPhoneOtp}
                  disabled={loading || !form.full_name || (
                    method === "email"
                      ? (!form.email || !form.password || !form.confirm)
                      : !form.phone
                  )}
                  className="btn-primary w-full justify-center py-3">
                  {loading
                    ? <><span className="animate-spin inline-block mr-2">⏳</span> جارٍ الإرسال...</>
                    : method === "email"
                      ? <>إنشاء الحساب <HiArrowLeft className="text-base" /></>
                      : <>إرسال رمز التحقق <HiArrowLeft className="text-base" /></>}
                </button>

                <div className="flex items-start gap-2 rounded-xl bg-[var(--bg-page)] border border-[var(--border)] p-3 text-xs text-[var(--text-muted)]">
                  <HiShieldCheck className="shrink-0 text-brand-700 text-base mt-0.5" />
                  {method === "email"
                    ? "سيصلك رابط تفعيل عبر البريد لتأكيد حسابك."
                    : "سيصلك رمز تحقق مكوّن من 6 أرقام عبر واتساب لتأكيد الرقم قبل تفعيل كلمة المرور."}
                </div>
              </div>
            )}

            {/* ── Step: otp (phone only) ── */}
            {step === "otp" && (
              <div className="space-y-6">
                {/* Phone display */}
                <div className="flex items-center gap-3 rounded-xl bg-[var(--bg-page)] border border-[var(--border)] px-4 py-3">
                  <HiDevicePhoneMobile className="text-brand-700 text-lg shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--text-muted)]">تم إرسال الرمز إلى</p>
                    <p className="text-sm font-semibold text-[var(--text-1)] truncate" dir="ltr">{form.phone}</p>
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
                    onComplete={verifyPhoneOtp}
                    disabled={verifying}
                    autoFocus
                  />
                </div>

                {/* Password fields */}
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">كلمة المرور *</label>
                    <div className="relative">
                      <HiLockClosed className="absolute top-3.5 end-3 text-sm text-[var(--text-muted)]" />
                      <input type={showPw ? "text" : "password"} dir="ltr" placeholder="••••••••"
                        value={phonePassword}
                        onChange={e => { setPhonePassword(e.target.value); setError(""); }}
                        className={`${iCls} pe-9 ps-10`} autoComplete="new-password" />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute top-3.5 start-3 text-[var(--text-muted)] hover:text-[var(--text-1)]">
                        {showPw ? <HiEyeSlash/> : <HiEye/>}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">تأكيد كلمة المرور *</label>
                    <input type={showPw ? "text" : "password"} dir="ltr" placeholder="••••••••"
                      value={phonePasswordConfirm}
                      onChange={e => { setPhonePasswordConfirm(e.target.value); setError(""); }}
                      className={iCls} autoComplete="new-password" />
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">أدخل الرمز أعلاه لإكمال إنشاء الحساب بعد تعبئة كلمة المرور.</p>
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
                    <button onClick={resendPhone}
                      className="flex items-center gap-1.5 mx-auto text-sm text-brand-700 dark:text-accent-400 hover:underline">
                      <HiArrowPath className="text-base" /> إعادة إرسال الرمز
                    </button>
                  )}
                </div>

                {/* Hint */}
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                  <p className="font-semibold">💡 لم يصلك الرمز؟</p>
                  <p>• الرمز صالح لمدة <strong>10 دقائق</strong></p>
                  <p>• يمكنك إعادة الإرسال بعد انتهاء العداد</p>
                </div>
              </div>
            )}
          </div>

          {(step === "form" || step === "otp") && (
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
