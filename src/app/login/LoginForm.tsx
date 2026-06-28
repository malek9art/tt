"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Phone, ArrowLeft, Loader2, CheckCircle, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type AuthStep = "phone" | "otp" | "done";

export default function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirectTo   = searchParams.get("redirectTo") ?? "/account";
  const { user }     = useAuthStore();

  const [step, setStep]       = useState<AuthStep>("phone");
  const [phone, setPhone]     = useState("");
  const [otp, setOtp]         = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [resendIn, setResend] = useState(0);

  useEffect(() => { if (user) router.replace(redirectTo); }, [user, router, redirectTo]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResend(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const fmt = (raw: string) => {
    const d = raw.replace(/\D/g, "");
    if (d.startsWith("00967")) return "+" + d.slice(2);
    if (d.startsWith("967"))   return "+" + d;
    if (d.startsWith("0"))     return "+967" + d.slice(1);
    return "+967" + d;
  };

  const handleSend = async () => {
    if (!phone.trim()) { setError("أدخل رقم هاتفك"); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithOtp({
      phone: fmt(phone), options: { channel: "sms" },
    });
    if (err && !err.message.includes("SMS") && !err.message.includes("configured")) {
      setError("تعذّر الإرسال، تحقق من الرقم");
    } else {
      setStep("otp"); setResend(60);
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (otp.length < 4) { setError("أدخل رمز التحقق"); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.verifyOtp({
      phone: fmt(phone), token: otp, type: "sms",
    });
    if (err) { setError("رمز التحقق غير صحيح"); }
    else { setStep("done"); setTimeout(() => router.replace(redirectTo), 1000); }
    setLoading(false);
  };

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
              {step === "phone" && "أدخل رقم هاتفك لاستقبال رمز التحقق"}
              {step === "otp"   && `تم إرسال الرمز إلى ${phone}`}
              {step === "done"  && "تم تسجيل دخولك بنجاح"}
            </p>
          </div>
          <div className="card-base p-6">
            {step === "done" && (
              <div className="py-8 text-center">
                <CheckCircle size={56} className="mx-auto mb-4 text-green-500" />
                <p className="font-semibold text-[var(--text-1)]">جارٍ تحويلك...</p>
              </div>
            )}
            {step === "phone" && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-[var(--text-2)]">رقم الهاتف</label>
                <div className="flex gap-2">
                  <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 text-sm text-[var(--text-muted)]">
                    <Phone size={14} className="ml-1" /> 967+
                  </div>
                  <input type="tel" dir="ltr" inputMode="numeric" placeholder="7XXXXXXXX"
                    value={phone} onChange={e => { setPhone(e.target.value); setError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors" />
                </div>
                {error && <p className="text-sm text-red-500">⚠ {error}</p>}
                <button onClick={handleSend} disabled={loading || !phone} className="btn-primary w-full justify-center">
                  {loading ? <><Loader2 size={16} className="animate-spin" /> جارٍ...</> : <>إرسال الرمز <ArrowLeft size={16} /></>}
                </button>
                <div className="flex items-center gap-2 rounded-lg bg-brand-50 dark:bg-brand-900/30 p-3 text-xs text-[var(--text-muted)]">
                  <ShieldCheck size={14} className="shrink-0 text-brand-700" />
                  بياناتك محمية ولن تُشارك مع أي طرف ثالث
                </div>
              </div>
            )}
            {step === "otp" && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-[var(--text-2)] text-center">رمز التحقق</label>
                <input type="text" dir="ltr" inputMode="numeric" maxLength={6}
                  placeholder="_ _ _ _ _ _" value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleVerify()}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-3 text-center text-2xl font-bold tracking-[0.5em] text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors" />
                {error && <p className="text-sm text-red-500 text-center">⚠ {error}</p>}
                <button onClick={handleVerify} disabled={loading || otp.length < 4} className="btn-primary w-full justify-center">
                  {loading ? <><Loader2 size={16} className="animate-spin" /> جارٍ...</> : "تأكيد الرمز"}
                </button>
                <div className="flex items-center justify-between text-sm">
                  <button onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
                    className="text-[var(--text-muted)] hover:text-brand-700 transition-colors">تغيير الرقم</button>
                  {resendIn > 0
                    ? <span className="text-[var(--text-muted)]">إعادة بعد {resendIn}ث</span>
                    : <button onClick={handleSend} className="text-brand-700 font-medium hover:text-brand-900 transition-colors">إعادة الإرسال</button>}
                </div>
              </div>
            )}
          </div>
          <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
            ليس لديك حساب؟{" "}
            <Link href="/register" className="font-medium text-brand-700 hover:text-brand-900 transition-colors">سجّل الآن</Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
