"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Mail, User, Loader2, CheckCircle, ArrowLeft } from "lucide-react";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Step = "form" | "sent" | "done";

export default function RegisterForm() {
  const router = useRouter();
  const [step,    setStep]    = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [form, setForm] = useState({ full_name: "", email: "" });

  const setF = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setError("");
  };

  const handleSend = async () => {
    if (!form.full_name.trim()) { setError("أدخل اسمك الكامل"); return; }
    if (!form.email.trim() || !form.email.includes("@")) {
      setError("أدخل بريداً إلكترونياً صحيحاً");
      return;
    }
    setLoading(true);
    setError("");

    const { error: err } = await supabase.auth.signInWithOtp({
      email: form.email,
      options: {
        data: { full_name: form.full_name },
        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=/account`,
        shouldCreateUser: true,
      },
    });

    if (err) {
      setError("تعذّر الإرسال — تحقق من البريد وحاول مجدداً");
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
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-500 text-brand-900 font-bold text-2xl shadow-lg">أ</div>
            <h1 className="text-2xl font-bold text-[var(--text-1)]">إنشاء حساب جديد</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">سجّل للتسوق وتتبع طلباتك</p>
          </div>

          <div className="card-base p-6">

            {/* ===== نجاح ===== */}
            {step === "done" && (
              <div className="py-8 text-center">
                <CheckCircle size={56} className="mx-auto mb-4 text-green-500" />
                <p className="text-lg font-bold text-[var(--text-1)]">أهلاً {form.full_name}!</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">تم إنشاء حسابك بنجاح</p>
              </div>
            )}

            {/* ===== تم الإرسال ===== */}
            {step === "sent" && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
                    <Mail size={28} className="text-green-600" />
                  </div>
                  <h2 className="font-bold text-[var(--text-1)] mb-2">تم إرسال رابط التأكيد!</h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    أرسلنا رابطاً إلى{" "}
                    <strong className="text-[var(--text-1)]">{form.email}</strong>
                  </p>
                </div>

                <div className="rounded-xl bg-brand-50 dark:bg-brand-900/30 p-4 space-y-2">
                  <p className="text-sm font-semibold text-brand-700 dark:text-accent-400">📧 خطوتان لتفعيل حسابك:</p>
                  <p className="text-sm text-[var(--text-2)]">① افتح تطبيق البريد الإلكتروني</p>
                  <p className="text-sm text-[var(--text-2)]">② اضغط زر <strong>تأكيد الحساب</strong> في الرسالة</p>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-3">
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    ⚠ افتح الرابط من نفس المتصفح. الرابط صالح لساعة واحدة.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => { setStep("form"); setError(""); }}
                    className="flex-1 btn-ghost border border-[var(--border)] text-sm">
                    تغيير البيانات
                  </button>
                  <button onClick={handleSend} disabled={loading}
                    className="flex-1 btn-primary text-sm justify-center">
                    {loading ? <Loader2 size={15} className="animate-spin" /> : "إعادة إرسال"}
                  </button>
                </div>
              </div>
            )}

            {/* ===== نموذج التسجيل ===== */}
            {step === "form" && (
              <div className="space-y-4">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
                    ⚠ {error}
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-2)]">
                    الاسم الكامل *
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute top-3 end-3 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="محمد أحمد العلوي"
                      value={form.full_name}
                      onChange={e => setF("full_name", e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSend()}
                      className={iCls + " pe-9"}
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-2)]">
                    البريد الإلكتروني *
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute top-3 end-3 text-[var(--text-muted)]" />
                    <input
                      type="email"
                      dir="ltr"
                      placeholder="example@gmail.com"
                      value={form.email}
                      onChange={e => setF("email", e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSend()}
                      className={iCls + " pe-9"}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSend}
                  disabled={loading || !form.full_name || !form.email}
                  className="btn-primary w-full justify-center">
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" /> جارٍ الإرسال...</>
                    : <>إنشاء الحساب <ArrowLeft size={16} /></>}
                </button>

                <p className="text-xs text-center text-[var(--text-muted)]">
                  ستصلك رسالة — اضغط الرابط لتفعيل حسابك فوراً
                </p>
              </div>
            )}
          </div>

          {step === "form" && (
            <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
              لديك حساب؟{" "}
              <Link href="/login" className="font-medium text-brand-700 hover:text-brand-900 transition-colors">
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
