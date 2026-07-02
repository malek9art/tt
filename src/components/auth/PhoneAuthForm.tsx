"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import OtpInput from "@/components/ui/OtpInput";
import {
  HiPhone, HiUser, HiCheckCircle, HiArrowLeft, HiArrowPath,
} from "react-icons/hi2";
import { FaWhatsapp } from "react-icons/fa6";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Props {
  mode:        "login" | "register";
  redirectTo?: string;
}

type Step = "form" | "otp" | "done";

function formatPhoneDisplay(raw: string): string {
  const d = raw.replace(/\D/g, "");
  const local = d.startsWith("967") ? d.slice(3) : d.startsWith("0") ? d.slice(1) : d;
  if (local.length === 9) return `+967 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  return `+967 ${local}`;
}

export default function PhoneAuthForm({ mode, redirectTo = "/account" }: Props) {
  const router = useRouter();

  const [step,      setStep]      = useState<Step>("form");
  const [phone,     setPhone]     = useState("");
  const [fullName,  setFullName]  = useState("");
  const [loading,   setLoading]   = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error,     setError]     = useState("");
  const [cooldown,  setCooldown]  = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendOtp = async () => {
    if (mode === "register" && !fullName.trim()) { setError("أدخل اسمك الكامل"); return; }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) { setError("أدخل رقم هاتف صحيح"); return; }

    setLoading(true); setError("");

    const res  = await fetch("/api/auth/phone/send", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ phone }),
    });
    const data = await res.json() as { success?: boolean; error?: string };

    setLoading(false);
    if (!res.ok || !data.success) {
      setError(data.error ?? "فشل في الإرسال — حاول مجدداً");
    } else {
      setStep("otp");
      setCooldown(60);
    }
  };

  const verifyOtp = async (code: string) => {
    setVerifying(true); setError("");

    const res  = await fetch("/api/auth/phone/verify", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ phone, code, full_name: fullName }),
    });
    const data = await res.json() as {
      success?: boolean; error?: string;
      access_token?: string; refresh_token?: string;
    };

    if (!res.ok || !data.success) {
      setVerifying(false);
      setError(data.error ?? "الرمز غير صحيح");
      return;
    }

    if (data.access_token && data.refresh_token) {
      await supabase.auth.setSession({
        access_token:  data.access_token,
        refresh_token: data.refresh_token,
      });
    }

    setVerifying(false);
    setStep("done");
    setTimeout(() => router.replace(redirectTo), 1200);
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setError("");
    const res  = await fetch("/api/auth/phone/send", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ phone }),
    });
    const data = await res.json() as { success?: boolean; error?: string };
    if (data.success) setCooldown(60);
    else setError(data.error ?? "فشل في إعادة الإرسال");
  };

  const iCls = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  if (step === "done") {
    return (
      <div className="py-10 text-center">
        <HiCheckCircle className="mx-auto mb-4 text-6xl text-green-500" />
        <p className="font-bold text-lg text-[var(--text-1)]">
          {mode === "register" ? "تم إنشاء حسابك بنجاح!" : "تم تسجيل الدخول بنجاح!"}
        </p>
        <p className="text-sm text-[var(--text-muted)] mt-1">جارٍ تحويلك...</p>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 rounded-xl bg-[var(--bg-page)] border border-[var(--border)] px-4 py-3">
          <FaWhatsapp className="text-green-500 text-xl shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[var(--text-muted)]">تم إرسال الرمز عبر واتساب إلى</p>
            <p className="text-sm font-bold text-[var(--text-1)]" dir="ltr">
              {formatPhoneDisplay(phone)}
            </p>
          </div>
          <button onClick={() => { setStep("form"); setError(""); }}
            className="text-xs text-brand-700 dark:text-accent-400 hover:underline shrink-0">
            تغيير
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-center text-sm font-medium text-[var(--text-2)]">
            أدخل الرمز المكوّن من 6 أرقام
          </p>
          <OtpInput length={6} onComplete={verifyOtp} disabled={verifying} autoFocus />
        </div>

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

        <div className="text-center">
          {cooldown > 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              إعادة إرسال بعد{" "}
              <span className="font-bold text-brand-700 dark:text-accent-400">{cooldown}</span> ثانية
            </p>
          ) : (
            <button onClick={resend}
              className="flex items-center gap-1.5 mx-auto text-sm text-brand-700 dark:text-accent-400 hover:underline">
              <HiArrowPath className="text-base" /> إعادة إرسال الرمز
            </button>
          )}
        </div>

        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-xs text-green-700 dark:text-green-300 space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            <FaWhatsapp className="text-base" /> تحقق من واتساب
          </p>
          <p>• افتح تطبيق <strong>واتساب</strong> وابحث عن الرسالة الجديدة</p>
          <p>• الرمز صالح لمدة <strong>10 دقائق</strong></p>
          <p>• إذا لم تصلك الرسالة، تحقق من أن الرقم مرتبط بواتساب</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
          ⚠ {error}
        </div>
      )}

      {mode === "register" && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">الاسم الكامل *</label>
          <div className="relative">
            <HiUser className="absolute top-3.5 end-3 text-sm text-[var(--text-muted)]" />
            <input type="text" placeholder="محمد أحمد"
              value={fullName}
              onChange={e => { setFullName(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && sendOtp()}
              className={`${iCls} pe-9`} autoComplete="name" />
          </div>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">رقم الواتساب *</label>
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-3 py-3 text-sm text-[var(--text-2)] shrink-0">
            🇾🇪 <span className="font-mono">+967</span>
          </div>
          <div className="relative flex-1">
            <HiPhone className="absolute top-3.5 end-3 text-sm text-[var(--text-muted)]" />
            <input type="tel" dir="ltr" placeholder="7XXXXXXXX"
              value={phone}
              onChange={e => { setPhone(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && sendOtp()}
              className={`${iCls} pe-9`} autoComplete="tel" inputMode="numeric" />
          </div>
        </div>
        <p className="mt-1 text-[10px] text-[var(--text-muted)]">
          أدخل رقمك اليمني المرتبط بواتساب (بدون 967 أو صفر في البداية)
        </p>
      </div>

      <button onClick={sendOtp}
        disabled={loading || !phone}
        className="btn-primary w-full justify-center py-3 gap-2">
        {loading
          ? <><span className="animate-spin">⏳</span> جارٍ الإرسال...</>
          : <><FaWhatsapp className="text-lg" /> إرسال رمز التأكيد عبر واتساب <HiArrowLeft className="text-base" /></>}
      </button>

      <div className="flex items-start gap-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-xs text-green-700 dark:text-green-300">
        <FaWhatsapp className="shrink-0 text-base mt-0.5" />
        ستصلك رسالة واتساب تحتوي على رمز مكوّن من 6 أرقام. مجاناً بدون رسوم.
      </div>
    </div>
  );
}
