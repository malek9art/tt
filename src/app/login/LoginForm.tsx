"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Mail, ArrowLeft, Loader2, CheckCircle, ShieldCheck, Phone } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Method = "email" | "phone";
type Step   = "input" | "otp" | "sent" | "done";

export default function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirectTo   = searchParams.get("redirectTo") ?? "/account";
  const { user }     = useAuthStore();

  const [method,  setMethod]  = useState<Method>("email");
  const [step,    setStep]    = useState<Step>("input");
  const [email,   setEmail]   = useState("");
  const [phone,   setPhone]   = useState("");
  const [otp,     setOtp]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [resendIn,setResend]  = useState(0);

  useEffect(() => { if (user) router.replace(redirectTo); }, [user, router, redirectTo]);
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResend(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const handleEmailSend = async () => {
    if (!email.trim() || !email.includes("@")) { setError("أدخل بريداً إلكترونياً صحيحاً"); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
        shouldCreateUser: true,
      },
    });
    if (err) { setError("تعذّر الإرسال، تحقق من البريد"); }
    else      { setStep("sent"); }
    setLoading(false);
  };

  const handleEmailOTP = async () => {
    if (otp.length < 6) { setError("الرمز 6 أرقام"); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
    if (err) { setError("الرمز غير صحيح أو منتهي الصلاحية"); }
    else     { setStep("done"); setTimeout(() => router.replace(redirectTo), 800); }
    setLoading(false);
  };

  const fmtPhone = (r: string) => {
    const d = r.replace(/\D/g,"");
    if(d.startsWith("00967")) return "+"+d.slice(2);
    if(d.startsWith("967"))   return "+"+d;
    if(d.startsWith("0"))     return "+967"+d.slice(1);
    return "+967"+d;
  };

  const handlePhoneSend = async () => {
    if (!phone.trim()) { setError("أدخل رقم هاتفك"); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithOtp({ phone: fmtPhone(phone), options: { channel: "sms" } });
    if (err && !err.message.includes("SMS") && !err.message.includes("configured")) {
      setError("SMS غير متاح — استخدم البريد الإلكتروني");
    } else { setStep("otp"); setResend(60); }
    setLoading(false);
  };

  const handlePhoneOTP = async () => {
    if (otp.length < 4) { setError("أدخل الرمز"); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.verifyOtp({ phone: fmtPhone(phone), token: otp, type: "sms" });
    if (err) { setError("الرمز غير صحيح"); }
    else     { setStep("done"); setTimeout(() => router.replace(redirectTo), 800); }
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
              {step==="done" ? "مرحباً بك!" : "تسجيل الدخول"}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {step==="input" && "اختر طريقة تسجيل الدخول"}
              {step==="otp"   && `أرسلنا رمزاً إلى ${phone}`}
              {step==="sent"  && `تحقق من بريدك: ${email}`}
              {step==="done"  && "جارٍ تحويلك..."}
            </p>
          </div>

          <div className="card-base p-6">
            {step==="done" && (
              <div className="py-8 text-center">
                <CheckCircle size={56} className="mx-auto mb-4 text-green-500" />
                <p className="font-semibold text-[var(--text-1)]">تم تسجيل الدخول بنجاح</p>
              </div>
            )}

            {step==="sent" && (
              <div className="py-2 text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
                  <Mail size={28} className="text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-1)] mb-1">تم إرسال رابط تسجيل الدخول!</p>
                  <p className="text-sm text-[var(--text-muted)]">تحقق من بريدك على <strong>{email}</strong></p>
                </div>
                <div className="rounded-lg bg-brand-50 dark:bg-brand-900/30 p-4 text-sm text-[var(--text-2)] text-right">
                  <p className="font-medium text-brand-700 dark:text-accent-400 mb-2">📧 خطوتان فقط:</p>
                  <p className="mb-1">① افتح بريدك الإلكتروني</p>
                  <p>② اضغط رابط "تسجيل الدخول" في الرسالة</p>
                </div>
                <div className="border-t border-[var(--border)] pt-4 space-y-3">
                  <p className="text-xs text-[var(--text-muted)]">أو أدخل الرمز المرسل في البريد</p>
                  <div className="flex gap-2">
                    <input type="text" dir="ltr" inputMode="numeric" maxLength={6}
                      placeholder="_ _ _ _ _ _" value={otp}
                      onChange={e=>{setOtp(e.target.value.replace(/\D/g,"")); setError("");}}
                      onKeyDown={e=>e.key==="Enter"&&handleEmailOTP()}
                      className={iCls+" text-center text-lg font-bold tracking-[0.4em]"} />
                    <button onClick={handleEmailOTP} disabled={loading||otp.length<6}
                      className="btn-primary px-4 whitespace-nowrap">
                      {loading?<Loader2 size={16} className="animate-spin"/>:"تأكيد"}
                    </button>
                  </div>
                  {error&&<p className="text-sm text-red-500">⚠ {error}</p>}
                </div>
                <div className="flex gap-3 justify-center text-sm">
                  <button onClick={handleEmailSend} className="text-brand-700 hover:text-brand-900 transition-colors font-medium">
                    إعادة الإرسال
                  </button>
                  <span className="text-[var(--border)]">|</span>
                  <button onClick={()=>{setStep("input");setOtp("");setError("");}}
                    className="text-[var(--text-muted)] hover:text-brand-700 transition-colors">
                    تغيير البريد
                  </button>
                </div>
              </div>
            )}

            {step==="otp" && method==="phone" && (
              <div className="space-y-4">
                <p className="text-sm text-[var(--text-2)] text-center">أرسلنا رمزاً إلى {phone}</p>
                <input type="text" dir="ltr" inputMode="numeric" maxLength={6}
                  placeholder="_ _ _ _ _ _" value={otp}
                  onChange={e=>{setOtp(e.target.value.replace(/\D/g,"")); setError("");}}
                  onKeyDown={e=>e.key==="Enter"&&handlePhoneOTP()}
                  className={iCls+" text-center text-2xl font-bold tracking-[0.5em]"} />
                {error&&<p className="text-sm text-red-500 text-center">⚠ {error}</p>}
                <button onClick={handlePhoneOTP} disabled={loading||otp.length<4} className="btn-primary w-full justify-center">
                  {loading?<><Loader2 size={16} className="animate-spin"/> جارٍ...</>:"تأكيد الرمز"}
                </button>
                <div className="flex items-center justify-between text-sm">
                  <button onClick={()=>{setStep("input");setOtp("");setError("");}}
                    className="text-[var(--text-muted)] hover:text-brand-700 transition-colors">رجوع</button>
                  {resendIn>0
                    ?<span className="text-[var(--text-muted)]">إعادة بعد {resendIn}ث</span>
                    :<button onClick={handlePhoneSend} className="text-brand-700 font-medium hover:text-brand-900 transition-colors">إعادة إرسال</button>}
                </div>
              </div>
            )}

            {step==="input" && (
              <div className="space-y-5">
                {/* اختيار الطريقة */}
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--border)] p-1">
                  <button onClick={()=>{setMethod("email");setError("");}}
                    className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${method==="email"?"bg-brand-700 text-white shadow":"text-[var(--text-2)] hover:bg-[var(--border)]"}`}>
                    <Mail size={15}/> البريد
                  </button>
                  <button onClick={()=>{setMethod("phone");setError("");}}
                    className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${method==="phone"?"bg-brand-700 text-white shadow":"text-[var(--text-2)] hover:bg-[var(--border)]"}`}>
                    <Phone size={15}/> الهاتف
                  </button>
                </div>

                {method==="email" && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[var(--text-2)]">البريد الإلكتروني</label>
                      <div className="relative">
                        <Mail size={15} className="absolute top-3 end-3 text-[var(--text-muted)]"/>
                        <input type="email" dir="ltr" placeholder="example@gmail.com"
                          value={email} onChange={e=>{setEmail(e.target.value);setError("");}}
                          onKeyDown={e=>e.key==="Enter"&&handleEmailSend()}
                          className={iCls+" pe-9"} />
                      </div>
                    </div>
                    {error&&<p className="text-sm text-red-500">⚠ {error}</p>}
                    <button onClick={handleEmailSend} disabled={loading||!email} className="btn-primary w-full justify-center">
                      {loading?<><Loader2 size={16} className="animate-spin"/> جارٍ...</>:<>إرسال رابط الدخول <ArrowLeft size={16}/></>}
                    </button>
                    <div className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-xs text-blue-700 dark:text-blue-300">
                      <span>💡</span> ستصلك رسالة — اضغط الرابط فيها للدخول فوراً
                    </div>
                  </div>
                )}

                {method==="phone" && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[var(--text-2)]">رقم الهاتف</label>
                      <div className="flex gap-2">
                        <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 text-sm text-[var(--text-muted)] whitespace-nowrap">
                          <Phone size={13} className="ml-1"/> 967+
                        </div>
                        <input type="tel" dir="ltr" inputMode="numeric" placeholder="7XXXXXXXX"
                          value={phone} onChange={e=>{setPhone(e.target.value);setError("");}}
                          onKeyDown={e=>e.key==="Enter"&&handlePhoneSend()}
                          className={iCls+" flex-1"} />
                      </div>
                    </div>
                    {error&&<p className="text-sm text-red-500">⚠ {error}</p>}
                    <button onClick={handlePhoneSend} disabled={loading||!phone} className="btn-primary w-full justify-center">
                      {loading?<><Loader2 size={16} className="animate-spin"/> جارٍ...</>:<>إرسال الرمز <ArrowLeft size={16}/></>}
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-page)] border border-[var(--border)] p-3 text-xs text-[var(--text-muted)]">
                  <ShieldCheck size={14} className="shrink-0 text-brand-700"/>
                  بياناتك محمية ولن تُشارك مع أي طرف ثالث
                </div>
              </div>
            )}
          </div>

          {step==="input" && (
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
