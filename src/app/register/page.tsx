"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Phone, User, Loader2, CheckCircle, ArrowLeft } from "lucide-react";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Step = "form" | "otp" | "done";

export default function RegisterPage() {
  const router = useRouter();
  const [step,      setStep]      = useState<Step>("form");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [otp,       setOtp]       = useState("");
  const [form, setForm] = useState({ full_name: "", phone: "" });

  const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setError(""); };

  const formatPhone = (raw: string) => {
    const d = raw.replace(/\D/g, "");
    if (d.startsWith("00967")) return "+" + d.slice(2);
    if (d.startsWith("967"))   return "+" + d;
    if (d.startsWith("0"))     return "+967" + d.slice(1);
    return "+967" + d;
  };

  const handleSend = async () => {
    if (!form.full_name.trim()) { setError("أدخل اسمك الكامل"); return; }
    if (!form.phone.trim())     { setError("أدخل رقم هاتفك");   return; }
    setLoading(true); setError("");
    const formatted = formatPhone(form.phone);

    const { error: err } = await supabase.auth.signInWithOtp({
      phone: formatted,
      options: {
        data: { full_name: form.full_name },
        channel: "sms",
      },
    });
    if (err && !err.message.includes("SMS") && !err.message.includes("not configured")) {
      setError("تعذّر الإرسال، تحقق من الرقم");
    } else {
      setStep("otp");
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (otp.length < 4) { setError("أدخل رمز التحقق"); return; }
    setLoading(true); setError("");
    const formatted = formatPhone(form.phone);

    const { data, error: err } = await supabase.auth.verifyOtp({
      phone: formatted, token: otp, type: "sms",
    });
    if (err) {
      setError("رمز التحقق غير صحيح أو منتهي الصلاحية");
    } else if (data?.user) {
      // تحديث الـ profile باسم المستخدم
      await supabase.from("profiles")
        .update({ full_name: form.full_name, phone: formatted })
        .eq("id", data.user.id);
      setStep("done");
      setTimeout(() => router.replace("/account"), 1500);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container-main flex min-h-[80vh] items-center justify-center py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-500 text-3xl text-brand-900 shadow-lg font-bold">أ</div>
            <h1 className="text-2xl font-bold text-[var(--text-1)]">إنشاء حساب جديد</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">سجّل للتسوق وتتبع طلباتك بسهولة</p>
          </div>

          <div className="card-base p-6">
            {step === "done" && (
              <div className="py-8 text-center">
                <CheckCircle size={56} className="mx-auto mb-4 text-green-500" />
                <p className="text-lg font-bold text-[var(--text-1)]">أهلاً {form.full_name}!</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">تم إنشاء حسابك بنجاح</p>
              </div>
            )}

            {step === "form" && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--text-2)]">الاسم الكامل *</label>
                  <div className="relative">
                    <User size={15} className="absolute top-3 end-3 text-[var(--text-muted)]" />
                    <input type="text" placeholder="محمد أحمد" value={form.full_name}
                      onChange={e => set("full_name", e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] pe-9 px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--text-2)]">رقم الهاتف *</label>
                  <div className="flex gap-2">
                    <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 text-sm text-[var(--text-muted)]">
                      <Phone size={14} className="ml-1.5" /> 967+
                    </div>
                    <input type="tel" dir="ltr" inputMode="numeric" placeholder="7XXXXXXXX"
                      value={form.phone} onChange={e => set("phone", e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSend()}
                      className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors" />
                  </div>
                </div>
                {error && <p className="text-sm text-red-500">⚠ {error}</p>}
                <button onClick={handleSend} disabled={loading || !form.full_name || !form.phone}
                  className="btn-primary w-full justify-center">
                  {loading ? <><Loader2 size={16} className="animate-spin" /> جارٍ...</> : <>إرسال رمز التحقق <ArrowLeft size={16} /></>}
                </button>
              </div>
            )}

            {step === "otp" && (
              <div className="space-y-4">
                <p className="text-sm text-[var(--text-2)] text-center">أرسلنا رمزاً إلى {form.phone}</p>
                <input
                  type="text" dir="ltr" inputMode="numeric" maxLength={6}
                  placeholder="_ _ _ _ _ _" value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleVerify()}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-3 text-center text-xl font-bold tracking-[0.5em] text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors" />
                {error && <p className="text-sm text-red-500 text-center">⚠ {error}</p>}
                <button onClick={handleVerify} disabled={loading || otp.length < 4}
                  className="btn-primary w-full justify-center">
                  {loading ? <><Loader2 size={16} className="animate-spin" /> جارٍ...</> : "تأكيد وإنشاء الحساب"}
                </button>
                <button onClick={() => { setStep("form"); setOtp(""); setError(""); }}
                  className="btn-ghost w-full justify-center text-sm">تغيير البيانات</button>
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
            لديك حساب؟{" "}
            <Link href="/login" className="font-medium text-brand-700 hover:text-brand-900 transition-colors">
              سجّل دخول
            </Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
