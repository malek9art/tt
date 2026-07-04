"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { useAuthStore } from "@/store/authStore";
import { ArrowRight, KeyRound, Eye, EyeOff, Loader2, CheckCircle, ShieldCheck, User, Save } from "lucide-react";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function AccountInfoCard() {
  const { user, profile, fetchProfile } = useAuthStore();
  const [name,    setName]    = useState(profile?.full_name ?? "");
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => { setName(profile?.full_name ?? ""); }, [profile?.full_name]);

  const save = async () => {
    if (!user) return;
    const trimmed = name.trim();
    if (!trimmed) { setError("الاسم مطلوب"); return; }
    setSaving(true); setError(""); setSaved(false);
    const { error: e } = await sb.from("profiles").update({ full_name: trimmed }).eq("id", user.id);
    setSaving(false);
    if (e) { setError(e.message); return; }
    await fetchProfile(user.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const iCls = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="card-base p-5 space-y-4">
      <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-700">
          <User size={18}/>
        </div>
        <div>
          <h2 className="font-semibold text-[var(--text-1)]">بيانات الحساب</h2>
          <p className="text-xs text-[var(--text-muted)]" dir="ltr">{user?.email}</p>
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          <CheckCircle size={16}/> تم حفظ الاسم بنجاح
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">الاسم الكامل</label>
        <input type="text" value={name}
          onChange={e => { setName(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && save()}
          className={iCls}/>
      </div>

      {error && <p className="text-sm text-red-500">⚠ {error}</p>}

      <button onClick={save} disabled={saving || !name.trim()}
        className="btn-primary gap-2 disabled:opacity-50">
        {saving ? <><Loader2 size={15} className="animate-spin"/> جارٍ الحفظ...</> : <><Save size={15}/> حفظ الاسم</>}
      </button>
    </div>
  );
}

export default function SecuritySettingsPage() {
  const { user } = useAuthStore();
  const [pw1,     setPw1]     = useState("");
  const [pw2,     setPw2]     = useState("");
  const [show,    setShow]    = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState("");

  const strength = (() => {
    let s = 0;
    if (pw1.length >= 8)  s++;
    if (pw1.length >= 12) s++;
    if (/[A-Z]/.test(pw1) && /[a-z]/.test(pw1)) s++;
    if (/\d/.test(pw1))   s++;
    if (/[^A-Za-z0-9]/.test(pw1)) s++;
    return s; // 0..5
  })();
  const strengthLabel = strength <= 2 ? "ضعيفة" : strength <= 3 ? "متوسطة" : "قوية";
  const strengthColor = strength <= 2 ? "bg-red-400" : strength <= 3 ? "bg-amber-400" : "bg-green-500";

  const submit = async () => {
    setError(""); setDone(false);
    if (pw1.length < 8)  { setError("كلمة المرور 8 أحرف على الأقل"); return; }
    if (pw1 !== pw2)     { setError("كلمتا المرور غير متطابقتين"); return; }
    setSaving(true);
    const { error: e } = await sb.auth.updateUser({ password: pw1 });
    setSaving(false);
    if (e) {
      setError(
        e.message.includes("different from the old")
          ? "كلمة المرور الجديدة مطابقة للحالية — اختر كلمة مختلفة"
          : e.message.includes("reauthentication") || e.message.includes("recent")
          ? "لأمان حسابك، سجّل الخروج ثم الدخول مجدداً وأعد المحاولة"
          : e.message
      );
      return;
    }
    setDone(true); setPw1(""); setPw2("");
  };

  const iCls = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="space-y-5 max-w-xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/settings"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-2)] hover:border-brand-300 transition-colors">
          <ArrowRight size={16}/>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">حسابي</h1>
          <p className="text-xs text-[var(--text-muted)]">بيانات الحساب وكلمة المرور</p>
        </div>
      </div>

      <AccountInfoCard/>

      <div className="card-base p-5 space-y-4">
        <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-700">
            <KeyRound size={18}/>
          </div>
          <div>
            <h2 className="font-semibold text-[var(--text-1)]">تغيير كلمة المرور</h2>
            <p className="text-xs text-[var(--text-muted)]" dir="ltr">{user?.email}</p>
          </div>
        </div>

        {done && (
          <div className="flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-400">
            <CheckCircle size={16}/> تم تغيير كلمة المرور بنجاح — استخدمها في تسجيل الدخول القادم
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">كلمة المرور الجديدة</label>
          <div className="relative">
            <input type={show ? "text" : "password"} dir="ltr" value={pw1}
              autoComplete="new-password"
              onChange={e => { setPw1(e.target.value); setError(""); }}
              className={`${iCls} pe-10`}/>
            <button type="button" onClick={() => setShow(s => !s)}
              aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              className="absolute top-1/2 -translate-y-1/2 end-3 text-[var(--text-muted)] hover:text-[var(--text-1)]">
              {show ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>
          {pw1 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                <div className={`h-full ${strengthColor} transition-all`} style={{ width: `${(strength / 5) * 100}%` }}/>
              </div>
              <span className="text-[11px] text-[var(--text-muted)]">{strengthLabel}</span>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">تأكيد كلمة المرور</label>
          <input type={show ? "text" : "password"} dir="ltr" value={pw2}
            autoComplete="new-password"
            onChange={e => { setPw2(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && submit()}
            className={`${iCls} ${pw2 && pw2 !== pw1 ? "!border-red-400" : ""}`}/>
          {pw2 && pw2 !== pw1 && <p className="mt-1 text-xs text-red-500">غير متطابقة</p>}
        </div>

        {error && <p className="text-sm text-red-500">⚠ {error}</p>}

        <button onClick={submit} disabled={saving || !pw1 || !pw2}
          className="btn-primary w-full justify-center gap-2 py-3 disabled:opacity-50">
          {saving ? <><Loader2 size={15} className="animate-spin"/> جارٍ الحفظ...</> : <><ShieldCheck size={15}/> حفظ كلمة المرور</>}
        </button>

        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          نصائح: استخدم 12 حرفاً فأكثر، وامزج أحرفاً كبيرة وصغيرة وأرقاماً ورموزاً،
          ولا تعد استخدام كلمة مرور مستعملة في مواقع أخرى.
        </p>
      </div>
    </div>
  );
}
