"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Mail, ArrowLeft, Loader2, CheckCircle, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// دائماً الدومين الصحيح — ليس localhost
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ahmadi-store.vercel.app";

type Step = "input" | "sent" | "done";

const ERROR_MESSAGES: Record<string, string> = {
  expired_link: "انتهت صلاحية الرابط — أرسل رابطاً جديداً",
  auth_failed:  "فشل التحقق — حاول مجدداً",
  missing_code: "رابط غير صالح — أرسل رابطاً جديداً",
  server_error: "خطأ في الخادم — حاول بعد قليل",
};

export default function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirectTo   = searchParams.get("redirectTo") ?? "/account";
  const urlError     = searchParams.get("error");
  const { user }     = useAuthStore();

  const [step,    setStep]    = useState<Step>("input");
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(
    urlError ? (ERROR_MESSAGES[urlError] ?? "حدث خطأ — حاول مجدداً") : ""
  );

  useEffect(() => {
    if (user) router.replace(redirectTo);
  }, [user, router, redirectTo]);

  const handleSend = async () => {
    if (!email.trim() || !email.includes("@")) {
      setError("أدخل بريداً إلكترونياً صحيحاً");
      return;
    }
    setLoading(true);
    setError("");

    const callbackUrl = `${APP_URL}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`;

    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: callbackUrl,
        shouldCreateUser: false,
      },
    });

    if (err) {
      if (err.message.includes("not found") || err.message.includes("User not found")) {
        setError("هذا البريد غير مسجّل — هل تريد إنشاء حساب جديد؟");
      } else {
        setError("تعذّر الإرسال — تحقق من البريد وحاول مجدداً");
      }
    } else {
      setStep("sent");
    }
    setLoading(false);
  };

  const iCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container-main flex min-h-[80vh] items-center justify-center py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-700 text-3xl text-white shadow-lg">أ</div>
            <h1 className="text-2xl font-bold text-[var(--text-1)]">
              {step === "done" ? "مرحباً بك!" : "تسجيل الدخول"}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {step === "input" && "أدخل بريدك لتلقّي رابط الدخول"}
              {step === "sent"  && `تحقق من بريدك: ${email}`}
              {step === "done"  && "جارٍ تحويلك..."}
            </p>
          </div>

          <div className="card-base p-6">
            {step === "done" && (
              <div className="py-8 text-center">
                <CheckCircle size={56} className="mx-auto mb-4 text-green-500" />
                <p className="font-semibold text-[var(--text-1)]">تم تسجيل الدخول بنجاح</p>
              </div>
            )}

            {step === "sent" && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
                    <Mail size={28} className="text-green-600" />
                  </div>
                  <h2 className="font-bold text-[var(--text-1)] mb-2">تم إرسال رابط الدخول!</h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    إلى <strong className="text-[var(--text-1)]">{email}</strong>
                  </p>
                </div>
                <div className="rounded-xl bg-brand-50 dark:bg-brand-900/30 p-4 space-y-2">
                  <p className="text-sm font-semibold text-brand-700 dark:text-accent-400">📧 خطوتان فقط:</p>
                  <p className="text-sm text-[var(--text-2)]">① افتح تطبيق البريد الإلكتروني</p>
                  <p className="text-sm text-[var(--text-2)]">② اضغط زر <strong>تسجيل الدخول</strong> في الرسالة</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-3 text-xs text-amber-700 dark:text-amber-300">
                  ⚠ افتح الرابط من <strong>Chrome</strong> أو متصفح عادي — ليس من داخل تطبيق Gmail.
                  الرابط صالح لساعة واحدة.
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setStep("input"); setError(""); }}
                    className="flex-1 btn-ghost border border-[var(--border)] text-sm">
                    تغيير البريد
                  </button>
                  <button onClick={handleSend} disabled={loading}
                    className="flex-1 btn-primary text-sm justify-center">
                    {loading ? <Loader2 size={15} className="animate-spin" /> : "إعادة إرسال"}
                  </button>
                </div>
              </div>
            )}

            {step === "input" && (
              <div className="space-y-4">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
                    ⚠ {error}
                    {error.includes("غير مسجّل") && (
                      <Link href="/register" className="block mt-1 text-brand-700 font-medium hover:underline">
                        إنشاء حساب جديد ←
                      </Link>
                    )}
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--text-2)]">البريد الإلكتروني</label>
                  <div className="relative">
                    <Mail size={15} className="absolute top-3 end-3 text-[var(--text-muted)]" />
                    <input type="email" dir="ltr" placeholder="example@gmail.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(""); }}
                      onKeyDown={e => e.key === "Enter" && handleSend()}
                      className={iCls + " pe-9"}
                      autoComplete="email" />
                  </div>
                </div>
                <button onClick={handleSend} disabled={loading || !email}
                  className="btn-primary w-full justify-center">
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" /> جارٍ الإرسال...</>
                    : <>إرسال رابط الدخول <ArrowLeft size={16} /></>}
                </button>
                <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-page)] border border-[var(--border)] p-3 text-xs text-[var(--text-muted)]">
                  <ShieldCheck size={14} className="shrink-0 text-brand-700" />
                  ستصلك رسالة — اضغط الرابط للدخول. لا كلمة مرور مطلوبة.
                </div>
              </div>
            )}
          </div>

          {step === "input" && (
            <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
              ليس لديك حساب؟{" "}
              <Link href="/register" className="font-medium text-brand-700 hover:text-brand-900 transition-colors">سجّل الآن</Link>
            </p>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
