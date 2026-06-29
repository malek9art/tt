"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Phone, Lock, Loader2, Eye, EyeOff } from "lucide-react";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DriverLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleLogin = async () => {
    if (!email || !password) { setError("أدخل بيانات الدخول"); return; }
    setLoading(true); setError("");

    const { data, error: err } = await sb.auth.signInWithPassword({
      email: email.trim().toLowerCase(), password,
    });
    if (err || !data.user) { setError("بيانات الدخول غير صحيحة"); setLoading(false); return; }

    // تحقق من وجود سجل في drivers
    const { data: driver } = await sb.from("drivers").select("id").eq("id", data.user.id).single();
    if (!driver) {
      await sb.auth.signOut();
      setError("هذا الحساب ليس حساب مندوب — تواصل مع الإدارة");
      setLoading(false); return;
    }
    router.replace("/driver");
  };

  const iCls = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)] p-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-700 text-white text-2xl font-bold shadow-lg">أ</div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">بوابة المناديب</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">مركز الأحمدي للجوالات</p>
        </div>

        <div className="card-base p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 p-3 text-sm text-red-600 text-center">
              ⚠ {error}
            </div>
          )}
          <div className="relative">
            <Phone size={16} className="absolute top-3.5 end-4 text-[var(--text-muted)]"/>
            <input type="email" dir="ltr" placeholder="البريد الإلكتروني"
              value={email} onChange={e=>{setEmail(e.target.value);setError("");}}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()}
              className={iCls+" pe-10"} autoComplete="email"/>
          </div>
          <div className="relative">
            <Lock size={16} className="absolute top-3.5 end-4 text-[var(--text-muted)]"/>
            <input type={showPw?"text":"password"} dir="ltr" placeholder="كلمة المرور"
              value={password} onChange={e=>{setPassword(e.target.value);setError("");}}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()}
              className={iCls+" pe-10 ps-12"} autoComplete="current-password"/>
            <button type="button" onClick={()=>setShowPw(!showPw)}
              className="absolute top-3 start-4 text-[var(--text-muted)] hover:text-[var(--text-1)] transition-colors">
              {showPw?<EyeOff size={16}/>:<Eye size={16}/>}
            </button>
          </div>
          <button onClick={handleLogin} disabled={loading||!email||!password}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-700 py-3 text-sm font-bold text-white hover:bg-brand-800 active:scale-[0.98] disabled:opacity-50 transition-all">
            {loading?<><Loader2 size={16} className="animate-spin"/> جارٍ الدخول...</>:"دخول"}
          </button>
        </div>
        <p className="text-center text-xs text-[var(--text-muted)] mt-4">
          للحصول على حساب تواصل مع المدير
        </p>
      </div>
    </div>
  );
}
