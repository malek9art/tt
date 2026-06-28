"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Mail, Phone, User, Loader2, CheckCircle, ArrowLeft } from "lucide-react";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Method = "email" | "phone";
type Step   = "form" | "otp" | "sent" | "done";

export default function RegisterForm() {
  const router = useRouter();
  const [method,  setMethod]  = useState<Method>("email");
  const [step,    setStep]    = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [otp,     setOtp]     = useState("");
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });
  const setF = (k: string, v: string) => { setForm(f=>({...f,[k]:v})); setError(""); };

  const fmtPhone = (r: string) => {
    const d=r.replace(/\D/g,"");
    if(d.startsWith("00967")) return "+"+d.slice(2);
    if(d.startsWith("967"))   return "+"+d;
    if(d.startsWith("0"))     return "+967"+d.slice(1);
    return "+967"+d;
  };

  const handleEmailSend = async () => {
    if (!form.full_name.trim()) { setError("أدخل اسمك"); return; }
    if (!form.email.includes("@")) { setError("بريد إلكتروني غير صحيح"); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithOtp({
      email: form.email,
      options: {
        data: { full_name: form.full_name },
        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=/account`,
        shouldCreateUser: true,
      },
    });
    if (err) { setError("تعذّر الإرسال"); }
    else     { setStep("sent"); }
    setLoading(false);
  };

  const handleEmailOTP = async () => {
    if (otp.length < 6) { setError("الرمز 6 أرقام"); return; }
    setLoading(true); setError("");
    const { data, error: err } = await supabase.auth.verifyOtp({ email: form.email, token: otp, type: "email" });
    if (err) { setError("الرمز غير صحيح"); }
    else if (data?.user) {
      await supabase.from("profiles").update({ full_name: form.full_name }).eq("id", data.user.id);
      setStep("done"); setTimeout(() => router.replace("/account"), 1200);
    }
    setLoading(false);
  };

  const handlePhoneSend = async () => {
    if (!form.full_name.trim()) { setError("أدخل اسمك"); return; }
    if (!form.phone.trim())     { setError("أدخل رقمك"); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithOtp({
      phone: fmtPhone(form.phone), options: { data:{full_name:form.full_name}, channel:"sms" },
    });
    if (err && !err.message.includes("SMS") && !err.message.includes("configured")) {
      setError("SMS غير متاح — استخدم البريد الإلكتروني");
    } else { setStep("otp"); }
    setLoading(false);
  };

  const handlePhoneOTP = async () => {
    if (otp.length < 4) { setError("أدخل الرمز"); return; }
    setLoading(true); setError("");
    const { data, error: err } = await supabase.auth.verifyOtp({
      phone: fmtPhone(form.phone), token: otp, type: "sms",
    });
    if (err) { setError("رمز غير صحيح"); }
    else if (data?.user) {
      await supabase.from("profiles").update({ full_name:form.full_name, phone:fmtPhone(form.phone) }).eq("id",data.user.id);
      setStep("done"); setTimeout(() => router.replace("/account"), 1200);
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
            <h1 className="text-2xl font-bold text-[var(--text-1)]">
              {step==="done" ? "أهلاً بك!" : "إنشاء حساب جديد"}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">سجّل للتسوق وتتبع طلباتك</p>
          </div>

          <div className="card-base p-6">
            {step==="done" && (
              <div className="py-8 text-center">
                <CheckCircle size={56} className="mx-auto mb-4 text-green-500"/>
                <p className="text-lg font-bold text-[var(--text-1)]">أهلاً {form.full_name}!</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">تم إنشاء حسابك بنجاح</p>
              </div>
            )}

            {step==="sent" && (
              <div className="py-2 text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
                  <Mail size={28} className="text-green-600"/>
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-1)] mb-1">تم الإرسال!</p>
                  <p className="text-sm text-[var(--text-muted)]">تحقق من بريدك على <strong>{form.email}</strong></p>
                </div>
                <div className="rounded-lg bg-brand-50 dark:bg-brand-900/30 p-4 text-sm text-[var(--text-2)] text-right">
                  <p className="mb-1">① افتح بريدك الإلكتروني</p>
                  <p>② اضغط رابط "تأكيد الحساب"</p>
                </div>
                <div className="border-t border-[var(--border)] pt-4 space-y-2">
                  <p className="text-xs text-[var(--text-muted)]">أو أدخل الرمز من البريد</p>
                  <div className="flex gap-2">
                    <input type="text" dir="ltr" inputMode="numeric" maxLength={6}
                      placeholder="_ _ _ _ _ _" value={otp}
                      onChange={e=>{setOtp(e.target.value.replace(/\D/g,"")); setError("");}}
                      onKeyDown={e=>e.key==="Enter"&&handleEmailOTP()}
                      className={iCls+" text-center text-lg font-bold tracking-[0.4em]"} />
                    <button onClick={handleEmailOTP} disabled={loading||otp.length<6}
                      className="btn-primary px-4">
                      {loading?<Loader2 size={16} className="animate-spin"/>:"تأكيد"}
                    </button>
                  </div>
                  {error&&<p className="text-sm text-red-500">⚠ {error}</p>}
                </div>
                <button onClick={()=>{setStep("form");setOtp("");setError("");}}
                  className="text-sm text-[var(--text-muted)] hover:text-brand-700 transition-colors">رجوع</button>
              </div>
            )}

            {step==="otp" && method==="phone" && (
              <div className="space-y-4">
                <p className="text-sm text-center text-[var(--text-2)]">أرسلنا رمزاً إلى {form.phone}</p>
                <input type="text" dir="ltr" inputMode="numeric" maxLength={6}
                  placeholder="_ _ _ _ _ _" value={otp}
                  onChange={e=>{setOtp(e.target.value.replace(/\D/g,"")); setError("");}}
                  onKeyDown={e=>e.key==="Enter"&&handlePhoneOTP()}
                  className={iCls+" text-center text-2xl font-bold tracking-[0.5em]"} />
                {error&&<p className="text-sm text-red-500 text-center">⚠ {error}</p>}
                <button onClick={handlePhoneOTP} disabled={loading||otp.length<4} className="btn-primary w-full justify-center">
                  {loading?<><Loader2 size={16} className="animate-spin"/> جارٍ...</>:"تأكيد وإنشاء الحساب"}
                </button>
                <button onClick={()=>{setStep("form");setOtp("");setError("");}}
                  className="btn-ghost w-full justify-center text-sm">رجوع</button>
              </div>
            )}

            {step==="form" && (
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

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الاسم الكامل *</label>
                  <div className="relative">
                    <User size={14} className="absolute top-3 end-3 text-[var(--text-muted)]"/>
                    <input type="text" placeholder="محمد أحمد" value={form.full_name}
                      onChange={e=>setF("full_name",e.target.value)}
                      className={iCls+" pe-9"} />
                  </div>
                </div>

                {method==="email" && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">البريد الإلكتروني *</label>
                    <div className="relative">
                      <Mail size={14} className="absolute top-3 end-3 text-[var(--text-muted)]"/>
                      <input type="email" dir="ltr" placeholder="example@gmail.com"
                        value={form.email} onChange={e=>setF("email",e.target.value)}
                        onKeyDown={e=>e.key==="Enter"&&handleEmailSend()}
                        className={iCls+" pe-9"} />
                    </div>
                  </div>
                )}

                {method==="phone" && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">رقم الهاتف *</label>
                    <div className="flex gap-2">
                      <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 text-sm text-[var(--text-muted)] whitespace-nowrap">
                        <Phone size={13} className="ml-1"/> 967+
                      </div>
                      <input type="tel" dir="ltr" placeholder="7XXXXXXXX" value={form.phone}
                        onChange={e=>setF("phone",e.target.value)}
                        onKeyDown={e=>e.key==="Enter"&&(method==="phone"?handlePhoneSend():handleEmailSend())}
                        className={iCls+" flex-1"} />
                    </div>
                  </div>
                )}

                {error&&<p className="text-sm text-red-500">⚠ {error}</p>}

                <button
                  onClick={method==="email"?handleEmailSend:handlePhoneSend}
                  disabled={loading||!form.full_name||(method==="email"?!form.email:!form.phone)}
                  className="btn-primary w-full justify-center">
                  {loading?<><Loader2 size={16} className="animate-spin"/> جارٍ...</>
                    :<>{method==="email"?"إرسال رابط التأكيد":"إرسال رمز التحقق"} <ArrowLeft size={16}/></>}
                </button>
              </div>
            )}
          </div>

          {step==="form" && (
            <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
              لديك حساب؟{" "}
              <Link href="/login" className="font-medium text-brand-700 hover:text-brand-900 transition-colors">سجّل دخول</Link>
            </p>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
