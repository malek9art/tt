"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Phone, Loader2, ArrowLeft } from "lucide-react";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep]     = useState<"phone"|"otp">("phone");
  const [phone, setPhone]   = useState("");
  const [otp, setOtp]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const fmt = (raw:string) => {
    const d=raw.replace(/\D/g,"");
    if(d.startsWith("00967")) return "+"+d.slice(2);
    if(d.startsWith("967"))   return "+"+d;
    if(d.startsWith("0"))     return "+967"+d.slice(1);
    return "+967"+d;
  };

  const handleSend = async () => {
    setLoading(true); setError("");
    const {error:err} = await supabase.auth.signInWithOtp({ phone:fmt(phone), options:{channel:"sms"} });
    if(err&&!err.message.includes("SMS")&&!err.message.includes("configured")){ setError("تعذّر الإرسال"); }
    else { setStep("otp"); }
    setLoading(false);
  };

  const handleVerify = async () => {
    setLoading(true); setError("");
    const {data,error:err} = await supabase.auth.verifyOtp({ phone:fmt(phone), token:otp, type:"sms" });
    if(err){ setError("رمز غير صحيح"); setLoading(false); return; }

    // التحقق من صلاحيات الإدارة
    const {data:ok} = await supabase.rpc("has_permission",{_user_id:data.user!.id,_perm:"products:read"});
    if(!ok){ await supabase.auth.signOut(); setError("ليس لديك صلاحيات الإدارة"); setLoading(false); return; }

    router.replace("/admin");
  };

  const inputCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-900 p-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-500 text-brand-900 font-bold text-2xl">أ</div>
          <h1 className="text-xl font-bold text-white">دخول لوحة الإدارة</h1>
          <p className="mt-1 text-sm text-brand-300">مركز الأحمدي للجوالات</p>
        </div>
        <div className="rounded-xl border border-brand-700 bg-brand-800 p-6 shadow-xl">
          {step==="phone" ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-brand-300">رقم الهاتف</label>
                <div className="flex gap-2">
                  <div className="flex items-center rounded-lg border border-brand-600 bg-brand-900 px-3 text-sm text-brand-400">
                    <Phone size={13} className="ml-1"/> 967+
                  </div>
                  <input type="tel" dir="ltr" placeholder="7XXXXXXXX" value={phone}
                    onChange={e=>setPhone(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSend()}
                    className="flex-1 rounded-lg border border-brand-600 bg-brand-900 px-3 py-2.5 text-sm text-white outline-none focus:border-accent-500 transition-colors"/>
                </div>
              </div>
              {error&&<p className="text-sm text-red-400">⚠ {error}</p>}
              <button onClick={handleSend} disabled={loading||!phone}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent-500 py-2.5 text-sm font-semibold text-brand-900 hover:bg-accent-600 disabled:opacity-50 transition-colors">
                {loading?<><Loader2 size={16} className="animate-spin"/> جارٍ...</>:<>إرسال الرمز <ArrowLeft size={14}/></>}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-brand-300 text-center">أرسلنا رمزاً إلى {phone}</p>
              <input type="text" dir="ltr" inputMode="numeric" maxLength={6}
                placeholder="_ _ _ _ _ _" value={otp}
                onChange={e=>setOtp(e.target.value.replace(/\D/g,""))}
                onKeyDown={e=>e.key==="Enter"&&handleVerify()}
                className="w-full rounded-lg border border-brand-600 bg-brand-900 px-3 py-3 text-center text-2xl font-bold tracking-[0.5em] text-white outline-none focus:border-accent-500 transition-colors"/>
              {error&&<p className="text-sm text-red-400 text-center">⚠ {error}</p>}
              <button onClick={handleVerify} disabled={loading||otp.length<4}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent-500 py-2.5 text-sm font-semibold text-brand-900 hover:bg-accent-600 disabled:opacity-50 transition-colors">
                {loading?<><Loader2 size={16} className="animate-spin"/> جارٍ...</>:"دخول إلى اللوحة"}
              </button>
              <button onClick={()=>{setStep("phone");setOtp("");setError("");}}
                className="w-full text-xs text-brand-400 hover:text-white transition-colors">تغيير الرقم</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
