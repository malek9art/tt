"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Loader2, ArrowLeft, CheckCircle, ShieldCheck } from "lucide-react";
import { Suspense } from "react";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Step = "input" | "sent";

const ERROR_MESSAGES: Record<string, string> = {
  expired_link:  "انتهت صلاحية الرابط — أرسل رابطاً جديداً",
  auth_failed:   "فشل التحقق — حاول مجدداً",
  unauthorized:  "ليس لديك صلاحيات الدخول للوحة الإدارة",
  missing_code:  "رابط غير صالح",
  server_error:  "خطأ في الخادم — حاول بعد قليل",
};

function AdminLoginContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const urlError     = searchParams.get("error");

  const [step,    setStep]    = useState<Step>("input");
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(
    urlError ? (ERROR_MESSAGES[urlError] ?? "حدث خطأ — حاول مجدداً") : ""
  );

  const handleSend = async () => {
    if (!email.trim() || !email.includes("@")) {
      setError("أدخل بريداً إلكترونياً صحيحاً");
      return;
    }
    setLoading(true);
    setError("");

    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?type=admin&redirectTo=/admin`,
        shouldCreateUser: false,
      },
    });

    if (err) {
      if (err.message.includes("not found") || err.message.includes("User not found")) {
        setError("هذا البريد غير مسجّل كمسؤول — تواصل مع المدير العام");
      } else {
        setError("تعذّر الإرسال — تحقق من البريد وحاول مجدداً");
      }
    } else {
      setStep("sent");
    }
    setLoading(false);
  };

  const iCls = "w-full rounded-lg border border-brand-600 bg-brand-900 px-3 py-2.5 text-sm text-white placeholder-brand-400 outline-none focus:border-accent-500 transition-colors";

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-900 p-4" dir="rtl">
      <div className="w-full max-w-sm">
        {/* الشعار */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-500 text-brand-900 font-bold text-2xl">أ</div>
          <h1 className="text-xl font-bold text-white">لوحة إدارة مركز الأحمدي</h1>
          <p className="mt-1 text-sm text-brand-300">للمسؤولين المخوّلين فقط</p>
        </div>

        <div className="rounded-xl border border-brand-700 bg-brand-800 p-6 shadow-xl">

          {/* ===== تم الإرسال ===== */}
          {step === "sent" && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-900/40">
                  <Mail size={24} className="text-green-400" />
                </div>
                <p className="font-bold text-white mb-1">تم إرسال رابط الدخول!</p>
                <p className="text-sm text-brand-300">
                  تحقق من بريدك: <strong className="text-white">{email}</strong>
                </p>
              </div>

              <div className="rounded-lg bg-brand-900/60 p-4 space-y-2">
                <p className="text-sm font-medium text-accent-400">📧 خطوتان للدخول:</p>
                <p className="text-sm text-brand-300">① افتح تطبيق البريد الإلكتروني</p>
                <p className="text-sm text-brand-300">② اضغط <strong className="text-white">دخول لوحة الإدارة</strong></p>
              </div>

              <div className="rounded-lg border border-amber-700/50 bg-amber-900/20 p-3">
                <p className="text-xs text-amber-400">
                  ⚠ افتح الرابط من نفس المتصفح. صالح لساعة واحدة.
                </p>
              </div>

              <div className="flex gap-2">
                <button onClick={() => { setStep("input"); setError(""); }}
                  className="flex-1 rounded-lg border border-brand-600 py-2 text-sm text-brand-300 hover:text-white transition-colors">
                  تغيير البريد
                </button>
                <button onClick={handleSend} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-accent-500 py-2 text-sm font-semibold text-brand-900 hover:bg-accent-600 disabled:opacity-50 transition-colors">
                  {loading ? <Loader2 size={14} className="animate-spin" /> : "إعادة إرسال"}
                </button>
              </div>
            </div>
          )}

          {/* ===== إدخال البريد ===== */}
          {step === "input" && (
            <div className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-700/50 bg-red-900/20 p-3 text-sm text-red-400">
                  ⚠ {error}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-brand-300">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute top-3 end-3 text-brand-400" />
                  <input
                    type="email"
                    dir="ltr"
                    placeholder="admin@ahmadi.ye"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                    className={iCls + " pe-9"}
                    autoComplete="email"
                  />
                </div>
              </div>

              <button
                onClick={handleSend}
                disabled={loading || !email}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent-500 py-2.5 text-sm font-semibold text-brand-900 hover:bg-accent-600 disabled:opacity-50 transition-colors">
                {loading
                  ? <><Loader2 size={15} className="animate-spin" /> جارٍ الإرسال...</>
                  : <>إرسال رابط الدخول <ArrowLeft size={14} /></>}
              </button>

              <div className="flex items-center gap-2 rounded-lg bg-brand-900/50 p-3 text-xs text-brand-400">
                <ShieldCheck size={13} className="shrink-0 text-accent-500" />
                رابط الدخول يُرسل فقط للمسؤولين المسجّلين
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-brand-500">
          افتح الرابط من نفس المتصفح الذي طلبت الدخول منه
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-brand-900">
        <div className="text-brand-400">جارٍ التحميل...</div>
      </div>
    }>
      <AdminLoginContent />
    </Suspense>
  );
}
