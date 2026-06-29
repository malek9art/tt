"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2, Eye, EyeOff, Truck } from "lucide-react";

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
    if (!email.trim() || !password.trim()) {
      setError("أدخل البريد وكلمة المرور"); return;
    }
    setLoading(true); setError("");

    const { data, error: err } = await sb.auth.signInWithPassword({
      email: email.trim().toLowerCase(), password,
    });

    if (err || !data.user) {
      setError("بيانات الدخول غير صحيحة");
      setLoading(false); return;
    }

    // التحقق من أن المستخدم منديب
    const authed = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${data.session!.access_token}` } } }
    );

    const { data: isDriver } = await authed.rpc("has_role", {
      _user_id: data.user.id, _role: "driver",
    });

    if (!isDriver) {
      await sb.auth.signOut();
      setError("هذا الحساب ليس حساب مندوب توصيل");
      setLoading(false); return;
    }

    router.replace("/driver");
  };

  const iCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)] p-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg">
            <Truck size={28}/>
          </div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">بوابة المناديب</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">مركز الأحمدي للجوالات</p>
        </div>

        <div className="card-base p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 p-3 text-sm text-red-600 text-center">
              ⚠ {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-2)]">البريد الإلكتروني</label>
            <div className="relative">
              <Mail size={15} className="absolute top-3 end-3 text-[var(--text-muted)] pointer-events-none"/>
              <input type="email" dir="ltr" placeholder="driver@ahmadi.ye" value={email}
                onChange={e=>{setEmail(e.target.value);setError("");}}
                onKeyDown={e=>e.key==="Enter"&&handleLogin()}
                className={iCls+" pe-9"} autoComplete="email" autoFocus/>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-2)]">كلمة المرور</label>
            <div className="relative">
              <Lock size={15} className="absolute top-3 end-3 text-[var(--text-muted)] pointer-events-none"/>
              <input type={showPw?"text":"password"} dir="ltr" placeholder="••••••••" value={password}
                onChange={e=>{setPassword(e.target.value);setError("");}}
                onKeyDown={e=>e.key==="Enter"&&handleLogin()}
                className={iCls+" pe-9 ps-10"} autoComplete="current-password"/>
              <button type="button" onClick={()=>setShowPw(!showPw)}
                className="absolute top-2.5 start-3 text-[var(--text-muted)] hover:text-[var(--text-1)] transition-colors">
                {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          <button onClick={handleLogin} disabled={loading||!email||!password}
            className="btn-primary w-full justify-center">
            {loading ? <><Loader2 size={16} className="animate-spin"/> جارٍ الدخول...</> : "دخول بوابة التوصيل"}
          </button>
        </div>
      </div>
    </div>
  );
}
