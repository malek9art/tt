"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { User, Phone, Mail, Save, Loader2, CheckCircle } from "lucide-react";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ProfilePage() {
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState("");
  const [userId,   setUserId]   = useState<string|null>(null);
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "",
  });

  useEffect(() => {
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      setForm(f => ({ ...f, email: user.email ?? "" }));
      sb.from("profiles").select("full_name, phone").eq("id", user.id).single()
        .then(({ data }) => {
          if (data) setForm(f => ({ ...f,
            full_name: data.full_name ?? "",
            phone:     data.phone     ?? "",
          }));
          setLoading(false);
        });
    });
  }, []);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true); setError(""); setSaved(false);
    const { error: dbErr } = await sb.from("profiles")
      .update({ full_name: form.full_name.trim() })
      .eq("id", userId);
    if (dbErr) setError(dbErr.message);
    else { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    setSaving(false);
  };

  const iCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-1)]">الملف الشخصي</h1>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">تعديل بياناتك الشخصية</p>
      </div>

      {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i=><div key={i} className="skeleton h-12 w-full rounded-lg"/>)}
          </div>
        ) : (
          <div className="card-base p-6 space-y-5">
            {/* الصورة الشخصية */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-700 text-2xl font-bold text-white">
                {form.full_name?.[0] ?? "م"}
              </div>
              <div>
                <p className="font-semibold text-[var(--text-1)]">{form.full_name || "مستخدم"}</p>
                <p className="text-sm text-[var(--text-muted)]">{form.email}</p>
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-5 space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 p-3 text-sm text-red-600">
                  ⚠ {error}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-2)]">الاسم الكامل</label>
                <div className="relative">
                  <User size={15} className="absolute top-3 end-3 text-[var(--text-muted)]"/>
                  <input type="text" placeholder="محمد أحمد" value={form.full_name}
                    onChange={e=>setForm(f=>({...f,full_name:e.target.value}))}
                    className={iCls+" pe-9"}/>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-2)]">رقم الهاتف</label>
                <div className="relative">
                  <Phone size={15} className="absolute top-3 end-3 text-[var(--text-muted)]"/>
                  <input type="tel" dir="ltr" value={form.phone} disabled
                    className={iCls+" pe-9 opacity-60 cursor-not-allowed"}/>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">لا يمكن تغيير رقم الجوال من هنا — تواصل مع الدعم الفني لتغييره</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-2)]">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail size={15} className="absolute top-3 end-3 text-[var(--text-muted)]"/>
                  <input type="email" dir="ltr" value={form.email} disabled
                    className={iCls+" pe-9 opacity-60 cursor-not-allowed"}/>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">لا يمكن تغيير البريد الإلكتروني</p>
              </div>

              <button onClick={handleSave} disabled={saving}
                className={`w-full justify-center ${saved ? "btn-ghost border border-green-400 text-green-600" : "btn-primary"}`}>
                {saving  ? <><Loader2 size={16} className="animate-spin"/> جارٍ الحفظ...</>
                 : saved ? <><CheckCircle size={16}/> تم الحفظ بنجاح</>
                 :         <><Save size={16}/> حفظ التعديلات</>}
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
