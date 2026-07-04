"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, X, ShieldCheck, ShieldOff, KeyRound, Users as UsersIcon } from "lucide-react";
import { toast } from "@/store/toastStore";
import { ASSIGNABLE_TABS } from "@/lib/admin/permission-tabs";

interface StaffAccount {
  id: string;
  email: string;
  full_name: string;
  active: boolean;
  created_at: string;
  role_names: string[];
  tabs: string[];
}

const EMPTY_FORM = { full_name: "", email: "", password: "", tabs: [] as string[] };

export default function StaffUsersPage() {
  const [staff,   setStaff]   = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const [modal,   setModal]   = useState<{ mode: "create" } | { mode: "edit"; account: StaffAccount } | null>(null);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [newPassword, setNewPassword] = useState<{ email: string; password: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/staff");
    const d = await res.json().catch(() => ({}));
    setStaff(d.staff ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY_FORM); setError(""); setModal({ mode: "create" }); };
  const openEdit = (account: StaffAccount) => {
    setForm({ full_name: account.full_name, email: account.email, password: "", tabs: [...account.tabs] });
    setError(""); setModal({ mode: "edit", account });
  };

  const toggleTab = (key: string) =>
    setForm(f => ({ ...f, tabs: f.tabs.includes(key) ? f.tabs.filter(t => t !== key) : [...f.tabs, key] }));

  const save = async () => {
    if (!modal) return;
    if (modal.mode === "create" && (!form.full_name.trim() || !form.email.trim())) {
      setError("الاسم والبريد الإلكتروني مطلوبان"); return;
    }
    setSaving(true); setError("");

    if (modal.mode === "create") {
      const res = await fetch("/api/admin/staff", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name, email: form.email,
          password: form.password || undefined, tabs: form.tabs,
        }),
      });
      const d = await res.json();
      setSaving(false);
      if (!res.ok) { setError(d.error ?? "فشلت الإضافة"); return; }
      toast.success(`تمت إضافة الموظف «${form.full_name}»`);
      if (d.password) setNewPassword({ email: form.email, password: d.password });
      setModal(null); load();
    } else {
      const res = await fetch(`/api/admin/staff/${modal.account.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tabs: form.tabs }),
      });
      setSaving(false);
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "فشل الحفظ"); return; }
      toast.success("تم تحديث صلاحيات الموظف");
      setModal(null); load();
    }
  };

  const resetPassword = async (account: StaffAccount) => {
    if (!confirm(`إعادة تعيين كلمة مرور «${account.full_name}»؟ ستُنشأ كلمة جديدة تلقائياً.`)) return;
    const res = await fetch(`/api/admin/users/${account.id}/credentials`, { method: "POST" });
    const d = await res.json();
    if (!res.ok) { toast.error(d.error ?? "فشلت العملية"); return; }
    setNewPassword({ email: account.email, password: d.password });
  };

  const toggleActive = async (account: StaffAccount) => {
    const res = await fetch(`/api/admin/users/${account.id}/credentials`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !account.active }),
    });
    if (!res.ok) { toast.error("فشلت العملية"); return; }
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-1)]">إدارة المستخدمين</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {staff.length} حساب موظف — حدّد لكل موظف التبويبات التي يستطيع الدخول إليها والعمل بها
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary gap-2 text-sm">
          <Plus size={15}/> إضافة موظف
        </button>
      </div>

      {newPassword && (
        <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-4 text-sm space-y-1">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-green-700 dark:text-green-400">✓ كلمة المرور الجديدة — انسخها الآن، لن تظهر مجدداً</p>
            <button onClick={() => setNewPassword(null)} className="text-green-700 dark:text-green-400"><X size={16}/></button>
          </div>
          <p className="text-[var(--text-2)]" dir="ltr">{newPassword.email}</p>
          <p className="font-mono font-bold text-lg text-[var(--text-1)]" dir="ltr">{newPassword.password}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 w-full rounded-xl"/>)}</div>
      ) : staff.length === 0 ? (
        <div className="card-base py-16 text-center">
          <UsersIcon size={40} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]"/>
          <p className="font-semibold text-[var(--text-1)] mb-1">لا يوجد موظفون بعد</p>
          <p className="text-sm text-[var(--text-muted)] mb-5">أضف موظفاً وحدّد له التبويبات التي يعمل بها</p>
          <button onClick={openCreate} className="btn-primary gap-2 text-sm mx-auto">
            <Plus size={15}/> إضافة موظف
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {staff.map(account => (
            <div key={account.id} className={`card-base p-4 transition-all ${!account.active ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[var(--text-1)]">{account.full_name || "بلا اسم"}</p>
                    {!account.active && (
                      <span className="text-[10px] rounded-full bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 px-2 py-0.5">معطّل</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)]" dir="ltr">{account.email}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {account.tabs.length === 0 ? (
                      <span className="text-[11px] text-[var(--text-muted)]">لا توجد تبويبات ممنوحة</span>
                    ) : ASSIGNABLE_TABS.filter(t => account.tabs.includes(t.key)).map(t => (
                      <span key={t.key} className="text-[11px] rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-accent-400 px-2 py-0.5">
                        {t.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <button onClick={() => openEdit(account)}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-2)] hover:border-brand-500 hover:text-brand-700 transition-colors">
                    تعديل الصلاحيات
                  </button>
                  <button onClick={() => resetPassword(account)} title="إعادة تعيين كلمة المرور"
                    className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors">
                    <KeyRound size={16}/>
                  </button>
                  <button onClick={() => toggleActive(account)}
                    title={account.active ? "تعطيل الحساب" : "تفعيل الحساب"}
                    className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    {account.active ? <ShieldOff size={16}/> : <ShieldCheck size={16}/>}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* نافذة إضافة/تعديل موظف */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xl">
            <div className="flex items-center justify-between p-6 pb-4 shrink-0">
              <h2 className="font-bold text-[var(--text-1)]">{modal.mode === "create" ? "إضافة موظف جديد" : "تعديل صلاحيات الموظف"}</h2>
              <button onClick={() => setModal(null)} className="text-[var(--text-muted)] hover:text-[var(--text-1)]">
                <X size={18}/>
              </button>
            </div>

            <div className="overflow-y-auto px-6 space-y-4">
              {modal.mode === "create" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الاسم الكامل *</label>
                    <input type="text" value={form.full_name} autoFocus
                      onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500"/>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">البريد الإلكتروني *</label>
                    <input type="email" dir="ltr" value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500"/>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">كلمة المرور</label>
                    <input type="text" dir="ltr" placeholder="تلقائية إن تُركت فارغة" value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500"/>
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-medium text-[var(--text-2)]">
                  التبويبات المسموحة — يفتح للموظف التبويب ويمنحه صلاحية العمل فيه
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ASSIGNABLE_TABS.map(t => (
                    <label key={t.key}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors ${
                        form.tabs.includes(t.key)
                          ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-accent-400"
                          : "border-[var(--border)] text-[var(--text-2)] hover:border-brand-300"
                      }`}>
                      <input type="checkbox" checked={form.tabs.includes(t.key)}
                        onChange={() => toggleTab(t.key)} className="h-3.5 w-3.5 rounded text-brand-700"/>
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-500">⚠ {error}</p>}
            </div>

            <div className="p-6 pt-4 shrink-0">
              <button onClick={save} disabled={saving} className="btn-primary w-full justify-center gap-2 disabled:opacity-50">
                {saving ? <><Loader2 size={14} className="animate-spin"/> جارٍ الحفظ...</> : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
