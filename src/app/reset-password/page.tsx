"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { HiLockClosed, HiCheckCircle, HiEye, HiEyeSlash } from "react-icons/hi2";
import { fetchUserPermissions } from "@/lib/admin/permission-tabs";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready,    setReady]    = useState(false);
  const [invalid,  setInvalid]  = useState(false);
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [show,     setShow]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState("");

  // The recovery link signs the user in with a temporary session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // If nothing after 4s, the link is invalid/expired
    const t = setTimeout(() => setInvalid(prev => prev || !ready ? true : prev), 4000);
    return () => { subscription.unsubscribe(); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (password.length < 8) { setError("كلمة المرور 8 أحرف على الأقل"); return; }
    if (password !== confirm) { setError("كلمتا المرور غير متطابقتين"); return; }
    setLoading(true); setError("");

    const { error: err } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (err) { setError("تعذّر التحديث — افتح الرابط من البريد مجدداً"); return; }

    setDone(true);
    // موظف/مدير يعود للوحة الإدارة بدل صفحة دخول العملاء
    const { data: { user } } = await supabase.auth.getUser();
    const permissions = user ? await fetchUserPermissions(supabase, user.id) : new Set<string>();
    const destination = permissions.size > 0 ? "/admin/login" : "/login";
    setTimeout(() => router.replace(destination), 2000);
  };

  const iCls = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container-main flex min-h-[80vh] items-center justify-center py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-700 text-white text-2xl shadow-lg">
              <HiLockClosed/>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-1)]">كلمة مرور جديدة</h1>
          </div>

          <div className="card-base p-6">
            {done ? (
              <div className="py-8 text-center space-y-3">
                <HiCheckCircle className="mx-auto text-6xl text-green-500" />
                <p className="font-bold text-lg text-[var(--text-1)]">تم تحديث كلمة المرور</p>
                <p className="text-sm text-[var(--text-muted)]">جارٍ تحويلك لتسجيل الدخول...</p>
              </div>
            ) : !ready && invalid ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-4xl">⚠️</p>
                <p className="font-bold text-[var(--text-1)]">الرابط غير صالح أو منتهي</p>
                <Link href="/forgot-password" className="btn-primary inline-flex mt-2">
                  طلب رابط جديد
                </Link>
              </div>
            ) : !ready ? (
              <div className="py-10 text-center text-sm text-[var(--text-muted)]">
                <span className="animate-spin inline-block mr-2">⏳</span> جارٍ التحقق من الرابط...
              </div>
            ) : (
              <div className="space-y-4">
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
                    ⚠ {error}
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">كلمة المرور الجديدة</label>
                  <div className="relative">
                    <input type={show ? "text" : "password"} dir="ltr" placeholder="••••••••"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(""); }}
                      className={`${iCls} pe-10`}
                      autoComplete="new-password" autoFocus />
                    <button type="button" onClick={() => setShow(!show)}
                      className="absolute top-3.5 end-3 text-[var(--text-muted)] hover:text-[var(--text-1)]">
                      {show ? <HiEyeSlash/> : <HiEye/>}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">تأكيد كلمة المرور</label>
                  <input type={show ? "text" : "password"} dir="ltr" placeholder="••••••••"
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError(""); }}
                    onKeyDown={e => e.key === "Enter" && save()}
                    className={iCls}
                    autoComplete="new-password" />
                </div>
                <button onClick={save} disabled={loading || !password || !confirm}
                  className="btn-primary w-full justify-center py-3">
                  {loading ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
