"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Mail, Phone, Loader2, ArrowLeft, CheckCircle } from "lucide-react";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Method = "email" | "phone";
type Step   = "input" | "sent" | "otp" | "done";

export default function AdminLoginPage() {
  const router = useRouter();
  const [method,  setMethod]  = useState<Method>("email");
  const [step,    setStep]    = useState<Step>("input");
  const [email,   setEmail]   = useState("");
  const [phone,   setPhone]   = useState("");
  const [otp,     setOtp]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const fmtPhone = (r: string) => {
    const d=r.replace(/\D/g,"");
    if(d.startsWith("00967")) return "+"+d.slice(2);
    if(d.startsWith("967"))   return "+"+d;
    if(d.startsWith("0"))     return "+967"+d.slice(1);
    return "+967"+d;
  };

  const verifyAdmin = async (userId: string) => {
    const { data: ok } = await supabase.rpc("has_permission", { _user_id: userId, _perm: "products:read" });
    if (!ok) {
      await supabase.auth.signOut();
      setError("ليس لديك صلاحيات الدخول للوحة الإدارة");
      setStep("input");
      return false;
    }
    return true;
  };

  const handleEmailSend = async () => {
    if (!email.includes("@")) { setError("بريد إلكتروني غير صحيح"); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=/admin&type=admin`,
        shouldCreateUser: false, // الإدارة تتطلب حساباً موجوداً
      },
    });
    if (err) { setError("تعذّر الإرسال — تحقق من البريد"); }
    else     { setStep("sent"); }
    setLoading(false);
  };

  const handleEmailOTP = async () => {
    if (otp.length < 6) { setError("الرمز 6 أرقام"); return; }
    setLoading(true); setError("");
    const { data, error: err } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
    if (err) { setError("الرمز غير صحيح أو منتهي الصلاحية"); setLoading(false); return; }
    if (data?.user) {
      const isAdmin = await verifyAdmin(data.user.id);
      if (isAdmin) { setStep("done"); setTimeout(() => router.replace("/admin"), 800); }
    }
    setLoading(false);
  };

  const handlePhoneSend = async () => {
    if (!phone.trim()) { setError("أدخل رقم هاتفك"); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithOtp({
      phone: fmtPhone(phone), options: { channel: "sms" },
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
      phone: fmtPhone(phone), token: otp, type: "sms",
    });
    if (err) { setError("الرمز غير صحيح"); setLoading(false); return; }
    if (data?.user) {
      const isAdmin = await verifyAdmin(data.user.id);
      if (isAdmin) { setStep("done"); setTimeout(() => router.replace("/admin"), 800); }
    }
    setLoading(false);
  };

  const iCls = "w-full rounded-lg border border-brand-600 bg-brand-900 px-3 py-2.5 text-sm text-white placeholder-brand-400 outline-none focus:border-accent-500 transition-colors";

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-900 p-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-500 text-brand-900 font-bold text-2xl">أ</div>
          <h1 className="text-xl font-bold text-white">لوحة إدارة مركز الأحمدي</h1>
          <p className="mt-1 text-sm text-brand-300">للموظفين المخوّلين فقط</p>
        </div>

        <div className="rounded-xl border border-brand-700 bg-brand-800 p-6 shadow-xl">
          {step==="done" && (
            <div className="py-8 text-center">
              <CheckCircle size={52} className="mx-auto mb-4 text-green-400"/>
              <p className="font-semibold text-white">جارٍ الدخول للوحة...</p>
            </div>
          )}

          {step==="sent" && (
            <div className="py-2 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-900/40">
                <Mail size={24} className="text-green-400"/>
              </div>
              <div>
                <p className="font-semibold text-white mb-1">تم إرسال رابط الدخول!</p>
                <p className="text-sm text-brand-300">تحقق من بريدك على <strong className="text-white">{email}</strong></p>
              </div>
              <div className="rounded-lg bg-brand-900/60 p-4 text-sm text-brand-300 text-right">
                <p className="mb-1">① افتح بريدك الإلكتروني</p>
                <p>② اضغط رابط "دخول لوحة الإدارة"</p>
              </div>
              <div className="border-t border-brand-700 pt-4 space-y-3">
                <p className="text-xs text-brand-400">أو أدخل الرمز من البريد</p>
                <div className="flex gap-2">
                  <input type="text" dir="ltr" inputMode="numeric" maxLength={6}
                    placeholder="_ _ _ _ _ _" value={otp}
                    onChange={e=>{setOtp(e.target.value.replace(/\D/g,"")); setError("");}}
                    onKeyDown={e=>e.key==="Enter"&&handleEmailOTP()}
                    className={iCls+" text-center text-lg font-bold tracking-[0.4em]"} />
                  <button onClick={handleEmailOTP} disabled={loading||otp.length<6}
                    className="flex items-center justify-center gap-1 rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-semibold text-brand-900 hover:bg-accent-600 disabled:opacity-50 transition-colors">
                    {loading?<Loader2 size={15} className="animate-spin"/>:"دخول"}
                  </button>
                </div>
                {error&&<p className="text-sm text-red-400">⚠ {error}</p>}
              </div>
              <button onClick={()=>{setStep("input");setOtp("");setError("");}}
                className="text-sm text-brand-400 hover:text-white transition-colors">تغيير البريد</button>
            </div>
          )}

          {step==="otp" && (
            <div className="space-y-4">
              <p className="text-sm text-brand-300 text-center">أرسلنا رمزاً إلى {phone}</p>
              <input type="text" dir="ltr" inputMode="numeric" maxLength={6}
                placeholder="_ _ _ _ _ _" value={otp}
                onChange={e=>{setOtp(e.target.value.replace(/\D/g,"")); setError("");}}
                onKeyDown={e=>e.key==="Enter"&&handlePhoneOTP()}
                className={iCls+" text-center text-2xl font-bold tracking-[0.5em]"} />
              {error&&<p className="text-sm text-red-400 text-center">⚠ {error}</p>}
              <button onClick={handlePhoneOTP} disabled={loading||otp.length<4}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent-500 py-2.5 text-sm font-semibold text-brand-900 hover:bg-accent-600 disabled:opacity-50 transition-colors">
                {loading?<><Loader2 size={15} className="animate-spin"/> جارٍ...</>:"دخول للوحة الإدارة"}
              </button>
              <button onClick={()=>{setStep("input");setOtp("");setError("");}}
                className="w-full text-xs text-brand-400 hover:text-white transition-colors text-center">رجوع</button>
            </div>
          )}

          {step==="input" && (
            <div className="space-y-5">
              {/* اختيار الطريقة */}
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-brand-700 p-1">
                <button onClick={()=>{setMethod("email");setError("");}}
                  className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-all ${method==="email"?"bg-accent-500 text-brand-900":"text-brand-300 hover:text-white"}`}>
                  <Mail size={14}/> البريد
                </button>
                <button onClick={()=>{setMethod("phone");setError("");}}
                  className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-all ${method==="phone"?"bg-accent-500 text-brand-900":"text-brand-300 hover:text-white"}`}>
                  <Phone size={14}/> الهاتف
                </button>
              </div>

              {method==="email" && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-brand-300">البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail size={14} className="absolute top-3 end-3 text-brand-400"/>
                      <input type="email" dir="ltr" placeholder="admin@ahmadi.ye"
                        value={email} onChange={e=>{setEmail(e.target.value);setError("");}}
                        onKeyDown={e=>e.key==="Enter"&&handleEmailSend()}
                        className={iCls+" pe-9"} />
                    </div>
                  </div>
                  {error&&<p className="text-sm text-red-400">⚠ {error}</p>}
                  <button onClick={handleEmailSend} disabled={loading||!email}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent-500 py-2.5 text-sm font-semibold text-brand-900 hover:bg-accent-600 disabled:opacity-50 transition-colors">
                    {loading?<><Loader2 size={15} className="animate-spin"/> جارٍ...</>:<>إرسال رابط الدخول <ArrowLeft size={14}/></>}
                  </button>
                </div>
              )}

              {method==="phone" && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-brand-300">رقم الهاتف</label>
                    <div className="flex gap-2">
                      <div className="flex items-center rounded-lg border border-brand-600 bg-brand-900 px-3 text-sm text-brand-400 whitespace-nowrap">
                        <Phone size={13} className="ml-1"/> 967+
                      </div>
                      <input type="tel" dir="ltr" inputMode="numeric" placeholder="7XXXXXXXX"
                        value={phone} onChange={e=>{setPhone(e.target.value);setError("");}}
                        onKeyDown={e=>e.key==="Enter"&&handlePhoneSend()}
                        className={iCls+" flex-1"} />
                    </div>
                  </div>
                  {error&&<p className="text-sm text-red-400">⚠ {error}</p>}
                  <button onClick={handlePhoneSend} disabled={loading||!phone}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent-500 py-2.5 text-sm font-semibold text-brand-900 hover:bg-accent-600 disabled:opacity-50 transition-colors">
                    {loading?<><Loader2 size={15} className="animate-spin"/> جارٍ...</>:<>إرسال الرمز <ArrowLeft size={14}/></>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-brand-500">
          للدخول برابط البريد: اضغط الرابط من نفس الجهاز
        </p>
      </div>
    </div>
  );
}
