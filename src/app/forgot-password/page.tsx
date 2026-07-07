"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import OtpInput from "@/components/ui/OtpInput";
import {
  HiEnvelope, HiCheckCircle, HiArrowLeft, HiKey,
  HiDevicePhoneMobile, HiEye, HiEyeSlash, HiArrowPath,
} from "react-icons/hi2";
import { validatePassword } from "@/lib/auth-validation";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type PhoneStep = "phone" | "otp" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [method, setMethod] = useState<"email" | "phone">("email");

  // مسار البريد
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  // مسار الجوال
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("phone");
  const [phone,      setPhone]      = useState("");
  const [cooldown,   setCooldown]   = useState(0);
  const [newPassword,        setNewPassword]        = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm]  = useState("");
  const [showPw,     setShowPw]     = useState(false);
  const [verifying,  setVerifying]  = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendEmailReset = async () => {
    if (!email.trim() || !email.includes("@")) {
      setError("أدخل بريداً إلكترونياً صحيحاً"); return;
    }
    setLoading(true); setError("");

    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const d = await res.json();

    setLoading(false);
    if (!res.ok) setError(d.error ?? "تعذّر الإرسال — تحقق من البريد وحاول مجدداً");
    else setSent(true);
  };

  const sendPhoneOtp = async () => {
    if (phone.replace(/\D/g, "").length < 9) { setError("أدخل رقم جوال صحيح"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/auth/phone/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone.trim() }),
    });
    const d = await res.json();
    setLoading(false);
    if (!res.ok) { setError(d.error ?? "تعذّر الإرسال"); return; }
    setPhoneStep("otp"); setCooldown(60);
  };

  const resendPhoneOtp = async () => {
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

  const verifyAndReset = async (code: string) => {
    if (newPassword !== newPasswordConfirm) { setError("كلمتا المرور غير متطابقتين"); return; }
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) { setError(pwCheck.error!); return; }

    setVerifying(true); setError("");
    const res = await fetch("/api/auth/phone/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: phone.trim(),
        code,
        password: newPassword,
        mode: "reset",
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
    setPhoneStep("done");
    setTimeout(() => router.replace("/account"), 1500);
  };

  const iCls = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container-main flex min-h-[80vh] items-center justify-center py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-700 text-white text-2xl shadow-lg">
              <HiKey/>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-1)]">إعادة تعيين كلمة المرور</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {method === "email"
                ? (sent ? "تحقق من بريدك الإلكتروني" : "أدخل بريدك وسنرسل لك رابط إعادة التعيين")
                : (phoneStep === "otp" ? `أدخل الرمز المُرسل إلى ${phone}` : "أدخل رقم جوالك وسنرسل لك رمز التحقق عبر واتساب")}
            </p>
          </div>

          <div className="card-base p-6">

            {/* اختيار الطريقة */}
            {!(method === "email" ? sent : phoneStep === "done") && (
              <div className="flex rounded-xl border border-[var(--border)] overflow-hidden mb-4">
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
            )}

            {/* ── مسار البريد ── */}
            {method === "email" && (
              sent ? (
                <div className="py-8 text-center space-y-3">
                  <HiCheckCircle className="mx-auto text-6xl text-green-500" />
                  <p className="font-bold text-lg text-[var(--text-1)]">تم إرسال الرابط</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    افتح الرسالة المُرسلة إلى <span className="font-semibold" dir="ltr">{email}</span> واضغط على الرابط لتعيين كلمة مرور جديدة.
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    لم تصلك الرسالة؟ غالباً ما تصل إلى مجلد الرسائل غير المرغوب فيها (Spam) — افتحها وحرّك الرسالة إلى البريد الوارد الرئيسي (Move to Inbox)
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
                      ⚠ {error}
                    </div>
                  )}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">البريد الإلكتروني</label>
                    <div className="relative">
                      <HiEnvelope className="absolute top-3.5 end-3 text-sm text-[var(--text-muted)]" />
                      <input type="email" dir="ltr" placeholder="example@gmail.com"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setError(""); }}
                        onKeyDown={e => e.key === "Enter" && sendEmailReset()}
                        className={`${iCls} pe-9`}
                        autoComplete="email" autoFocus />
                    </div>
                  </div>
                  <button onClick={sendEmailReset} disabled={loading || !email}
                    className="btn-primary w-full justify-center py-3">
                    {loading
                      ? <><span className="animate-spin inline-block mr-2">⏳</span> جارٍ الإرسال...</>
                      : <>إرسال رابط إعادة التعيين <HiArrowLeft className="text-base" /></>}
                  </button>
                </div>
              )
            )}

            {/* ── مسار الجوال ── */}
            {method === "phone" && phoneStep === "phone" && (
              <div className="space-y-4">
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
                    ⚠ {error}
                  </div>
                )}
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
                <button onClick={sendPhoneOtp} disabled={loading || !phone}
                  className="btn-primary w-full justify-center py-3">
                  {loading
                    ? <><span className="animate-spin inline-block mr-2">⏳</span> جارٍ الإرسال...</>
                    : <>إرسال رمز التحقق <HiArrowLeft className="text-base" /></>}
                </button>
              </div>
            )}

            {method === "phone" && phoneStep === "otp" && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 rounded-xl bg-[var(--bg-page)] border border-[var(--border)] px-4 py-3">
                  <HiDevicePhoneMobile className="text-brand-700 text-lg shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--text-muted)]">تم إرسال الرمز إلى</p>
                    <p className="text-sm font-semibold text-[var(--text-1)] truncate" dir="ltr">{phone}</p>
                  </div>
                  <button onClick={() => { setPhoneStep("phone"); setError(""); }}
                    className="text-xs text-brand-700 dark:text-accent-400 hover:underline shrink-0">
                    تغيير
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">كلمة المرور الجديدة *</label>
                    <div className="relative">
                      <input type={showPw ? "text" : "password"} dir="ltr" placeholder="••••••••"
                        value={newPassword}
                        onChange={e => { setNewPassword(e.target.value); setError(""); }}
                        className={`${iCls} pe-10`} autoComplete="new-password" />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute top-3.5 end-3 text-[var(--text-muted)] hover:text-[var(--text-1)]">
                        {showPw ? <HiEyeSlash/> : <HiEye/>}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">تأكيد كلمة المرور *</label>
                    <input type={showPw ? "text" : "password"} dir="ltr" placeholder="••••••••"
                      value={newPasswordConfirm}
                      onChange={e => { setNewPasswordConfirm(e.target.value); setError(""); }}
                      className={iCls} autoComplete="new-password" />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-center text-sm font-medium text-[var(--text-2)]">
                    {newPassword && newPasswordConfirm
                      ? "أدخل الرمز المكوّن من 6 أرقام لإكمال تحديث كلمة المرور"
                      : "عبّئ كلمة المرور الجديدة أعلاه أولاً، ثم أدخل الرمز المكوّن من 6 أرقام"}
                  </p>
                  <OtpInput length={6} onComplete={verifyAndReset} disabled={verifying || !newPassword || !newPasswordConfirm} autoFocus />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400 text-center">
                    ⚠ {error}
                  </div>
                )}

                {verifying && (
                  <p className="text-center text-sm text-[var(--text-muted)]">
                    <span className="animate-spin inline-block mr-1">⏳</span> جارٍ التحقق...
                  </p>
                )}

                <div className="text-center">
                  {cooldown > 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">
                      إعادة إرسال بعد <span className="font-bold text-brand-700 dark:text-accent-400">{cooldown}</span> ثانية
                    </p>
                  ) : (
                    <button onClick={resendPhoneOtp}
                      className="flex items-center gap-1.5 mx-auto text-sm text-brand-700 dark:text-accent-400 hover:underline">
                      <HiArrowPath className="text-base" /> إعادة إرسال الرمز
                    </button>
                  )}
                </div>
              </div>
            )}

            {method === "phone" && phoneStep === "done" && (
              <div className="py-8 text-center space-y-3">
                <HiCheckCircle className="mx-auto text-6xl text-green-500" />
                <p className="font-bold text-lg text-[var(--text-1)]">تم تحديث كلمة المرور</p>
                <p className="text-sm text-[var(--text-muted)]">جارٍ تحويلك لحسابك...</p>
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
            تذكرت كلمة المرور؟{" "}
            <Link href="/login" className="font-medium text-brand-700 hover:text-brand-900 dark:text-accent-400 transition-colors">
              تسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
