"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleLogin = async () => {
    if (!email.trim())    { setError("أدخل البريد الإلكتروني"); return; }
    if (!password.trim()) { setError("أدخل كلمة المرور");       return; }

    setLoading(true);
    setError("");

    // ننشئ client جديد في كل مرة لضمان نظافة الجلسة
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. تسجيل الدخول
    const { data, error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInErr || !data.user || !data.session) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      setLoading(false);
      return;
    }

    // 2. التحقق من الصلاحيات باستخدام access_token مباشرة
    // نُنشئ client بالـ token الجديد صراحةً
    const authedSupabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        },
      }
    );

    const { data: isAdmin, error: rpcErr } = await authedSupabase.rpc(
      "has_permission",
      { _user_id: data.user.id, _perm: "products:read" }
    );

    if (rpcErr) {
      console.error("RPC error:", rpcErr);
      // في حالة فشل الـ RPC، نتحقق من الدور مباشرة
      const { data: roleData } = await authedSupabase
        .from("user_roles")
        .select("roles(name)")
        .eq("user_id", data.user.id)
        .limit(1)
        .single();

      const roleName = (roleData?.roles as { name?: string } | null)?.name;
      if (!roleName || !["super_admin","admin","manager"].includes(roleName)) {
        await supabase.auth.signOut();
        setError("ليس لديك صلاحيات الدخول للوحة الإدارة");
        setLoading(false);
        return;
      }
    } else if (!isAdmin) {
      await supabase.auth.signOut();
      setError("ليس لديك صلاحيات الدخول للوحة الإدارة");
      setLoading(false);
      return;
    }

    // 3. الدخول ناجح — التوجيه للوحة
    router.replace("/admin");
  };

  const iCls = [
    "w-full rounded-lg border border-brand-600",
    "bg-brand-900 px-3 py-2.5 text-sm text-white",
    "placeholder-brand-400 outline-none",
    "focus:border-accent-400 transition-colors",
  ].join(" ");

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      dir="rtl"
      style={{ background: "linear-gradient(135deg, #031E22 0%, #09444C 100%)" }}
    >
      <div className="w-full max-w-sm">
        {/* الشعار */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-500 text-brand-900 font-bold text-2xl shadow-xl">
            أ
          </div>
          <h1 className="text-xl font-bold text-white">مركز الأحمدي للجوالات</h1>
          <p className="mt-1 text-sm text-brand-300">لوحة الإدارة — للمسؤولين فقط</p>
        </div>

        {/* البطاقة */}
        <div className="rounded-2xl border border-brand-700/50 bg-brand-800/80 p-6 shadow-2xl backdrop-blur">
          <h2 className="mb-5 text-center text-base font-semibold text-white">تسجيل الدخول</h2>

          {error && (
            <div className="mb-4 rounded-lg border border-red-700/50 bg-red-900/30 p-3 text-sm text-red-400 text-center">
              ⚠ {error}
            </div>
          )}

          <div className="space-y-4">
            {/* البريد */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-brand-300">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail size={15} className="absolute top-3 end-3 text-brand-400 pointer-events-none" />
                <input
                  type="email" dir="ltr" placeholder="admin@ahmadi.ye"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  className={iCls + " pe-9"}
                  autoComplete="email" autoFocus
                />
              </div>
            </div>

            {/* كلمة المرور */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-brand-300">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock size={15} className="absolute top-3 end-3 text-brand-400 pointer-events-none" />
                <input
                  type={showPw ? "text" : "password"} dir="ltr"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  className={iCls + " pe-9 ps-10"}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute top-2.5 start-3 text-brand-400 hover:text-brand-200 transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* زر الدخول */}
            <button
              onClick={handleLogin}
              disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent-500 py-3 text-sm font-bold text-brand-900 hover:bg-accent-400 active:scale-[0.98] disabled:opacity-50 transition-all shadow-lg shadow-accent-500/20">
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> جارٍ التحقق...</>
                : "دخول للوحة الإدارة"}
            </button>
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-lg bg-brand-900/50 p-3 text-xs text-brand-400">
            <ShieldCheck size={13} className="shrink-0 text-accent-500" />
            الدخول مقتصر على المسؤولين المسجّلين
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-brand-600">
          مركز الأحمدي للجوالات ومستلزماتها · تعز، اليمن
        </p>
      </div>
    </div>
  );
}
