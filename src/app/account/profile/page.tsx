"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useAuthStore } from "@/store/authStore";
import { Save, Loader2, CheckCircle, User } from "lucide-react";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ProfilePage() {
  const { user, profile, fetchProfile } = useAuthStore();
  const [form, setForm]   = useState({ full_name:"", phone:"" });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState("");

  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name ?? "", phone: profile.phone ?? "" });
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    if (!form.full_name.trim()) { setError("الاسم إلزامي"); return; }
    setSaving(true); setError("");
    const { error: err } = await sb
      .from("profiles")
      .update({ full_name: form.full_name.trim(), phone: form.phone.trim() || null })
      .eq("id", user.id);
    if (err) { setError("حدث خطأ أثناء الحفظ"); }
    else { setSaved(true); fetchProfile(user.id); setTimeout(() => setSaved(false), 3000); }
    setSaving(false);
  };

  const iCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[var(--text-1)]">الملف الشخصي</h1>

      <div className="card-base p-6 space-y-5">
        {/* الصورة الرمزية */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-accent-400 text-2xl font-bold">
            {form.full_name?.[0] ?? <User size={24}/>}
          </div>
          <div>
            <p className="font-semibold text-[var(--text-1)]">{form.full_name || "اسم المستخدم"}</p>
            <p className="text-sm text-[var(--text-muted)]">{user?.email}</p>
          </div>
        </div>

        <div className="border-t border-[var(--border)] pt-5 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 p-3 text-sm text-red-600">
              ⚠ {error}
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-2)]">الاسم الكامل *</label>
            <input type="text" value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              className={iCls} placeholder="أدخل اسمك الكامل"/>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-2)]">رقم الهاتف</label>
            <input type="tel" dir="ltr" value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className={iCls} placeholder="+967 7XX XXX XXX"/>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-2)]">البريد الإلكتروني</label>
            <input type="email" dir="ltr" value={user?.email ?? ""}
              disabled className={iCls + " opacity-60 cursor-not-allowed"}/>
            <p className="text-xs text-[var(--text-muted)] mt-1">لا يمكن تغيير البريد الإلكتروني</p>
          </div>
          <button onClick={handleSave} disabled={saving}
            className={`w-full justify-center ${saved ? "btn-ghost border border-green-400 text-green-600" : "btn-primary"}`}>
            {saving  ? <><Loader2 size={15} className="animate-spin"/> حفظ...</>
             : saved  ? <><CheckCircle size={15}/> تم الحفظ</>
             :          <><Save size={15}/> حفظ التغييرات</>}
          </button>
        </div>
      </div>
    </div>
  );
}
