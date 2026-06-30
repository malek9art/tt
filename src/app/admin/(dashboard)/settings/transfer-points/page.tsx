"use client";
import { useEffect, useState, useCallback } from "react";
import {
  HiPlus, HiPencil, HiTrash, HiCheckCircle, HiXCircle,
  HiPhone, HiBuildingLibrary,
} from "react-icons/hi2";

interface Point {
  id: string;
  provider_code: string;
  label: string;
  phone: string;
  account_name: string | null;
  notes: string | null;
  is_active: boolean;
  display_order: number;
}

const PROVIDERS = [
  { code: "kuraimi", label: "الكريمي" },
  { code: "qutaibi", label: "القطيبي" },
  { code: "floosak",  label: "فلوسك" },
  { code: "onecash",  label: "وان كاش" },
  { code: "jawali",   label: "جوالي" },
  { code: "jeeb",     label: "جيب" },
  { code: "yemenmobile", label: "يمن موبايل" },
];

const emptyForm = {
  provider_code: "kuraimi", label: "", phone: "",
  account_name: "", notes: "", is_active: true, display_order: 0,
};

export default function TransferPointsPage() {
  const [points,    setPoints]    = useState<Point[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(false);
  const [editing,   setEditing]   = useState<Point | null>(null);
  const [form,      setForm]      = useState(emptyForm);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/transfer-points");
    const d   = await res.json();
    setPoints(d.points ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModal(true);
  };

  const openEdit = (pt: Point) => {
    setEditing(pt);
    setForm({
      provider_code: pt.provider_code,
      label:         pt.label,
      phone:         pt.phone,
      account_name:  pt.account_name ?? "",
      notes:         pt.notes ?? "",
      is_active:     pt.is_active,
      display_order: pt.display_order,
    });
    setError("");
    setModal(true);
  };

  const save = async () => {
    if (!form.label.trim() || !form.phone.trim()) {
      setError("الاسم ورقم الهاتف إلزاميان"); return;
    }
    setSaving(true); setError("");
    const url    = editing ? `/api/admin/transfer-points/${editing.id}` : "/api/admin/transfer-points";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error ?? "خطأ"); setSaving(false); return; }
    setModal(false);
    load();
    setSaving(false);
  };

  const toggleActive = async (pt: Point) => {
    await fetch(`/api/admin/transfer-points/${pt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !pt.is_active }),
    });
    load();
  };

  const del = async (id: string) => {
    if (!confirm("حذف هذه النقطة؟")) return;
    await fetch(`/api/admin/transfer-points/${id}`, { method: "DELETE" });
    load();
  };

  const grouped = PROVIDERS.map(p => ({
    ...p,
    items: points.filter(pt => pt.provider_code === p.code),
  })).filter(g => g.items.length > 0 || true);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-1)]">نقاط التحويل</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            أرقام نقاط الكريمي، القطيبي والمحافظ — تُعرض للعميل مع زر النسخ
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary gap-2">
          <HiPlus className="text-base"/> إضافة نقطة
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl"/>)}</div>
      ) : points.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
          <HiBuildingLibrary className="text-5xl mx-auto mb-3 text-[var(--text-muted)] opacity-40"/>
          <p className="font-medium text-[var(--text-2)]">لا توجد نقاط بعد</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">أضف نقاط التحويل لتظهر للعملاء في صفحة الدفع</p>
          <button onClick={openCreate} className="btn-primary mt-4 gap-2">
            <HiPlus/> إضافة أول نقطة
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(g => (
            <div key={g.code}>
              <h2 className="text-base font-semibold text-[var(--text-1)] mb-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-700 dark:bg-accent-500 inline-block"/>
                {g.label}
                <span className="text-xs font-normal text-[var(--text-muted)]">({g.items.length})</span>
              </h2>
              <div className="space-y-2">
                {g.items.map(pt => (
                  <div key={pt.id} className={`card-base flex items-center gap-4 p-4 transition-all ${!pt.is_active ? "opacity-60" : ""}`}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/30">
                      <HiPhone className="text-brand-700 dark:text-accent-400 text-lg"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-[var(--text-1)]">{pt.label}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs font-bold text-brand-700 dark:text-accent-400" dir="ltr">{pt.phone}</span>
                        {pt.account_name && <span className="text-xs text-[var(--text-muted)]">· {pt.account_name}</span>}
                        {pt.notes && <span className="text-xs text-[var(--text-muted)]">· {pt.notes}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => toggleActive(pt)}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                          pt.is_active
                            ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-[var(--border)] text-[var(--text-muted)]"
                        }`}>
                        {pt.is_active
                          ? <><HiCheckCircle className="text-sm"/> فعّال</>
                          : <><HiXCircle className="text-sm"/> معطّل</>}
                      </button>
                      <button onClick={() => openEdit(pt)}
                        className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors">
                        <HiPencil className="text-base"/>
                      </button>
                      <button onClick={() => del(pt.id)}
                        className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <HiTrash className="text-base"/>
                      </button>
                    </div>
                  </div>
                ))}
                {g.items.length === 0 && (
                  <p className="text-sm text-[var(--text-muted)] px-4">لا توجد نقاط لهذا المزود</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModal(false)}/>
          <div className="relative w-full max-w-md rounded-2xl bg-[var(--bg-card)] shadow-2xl border border-[var(--border)] p-6 space-y-4">
            <h3 className="text-lg font-bold text-[var(--text-1)]">
              {editing ? "تعديل النقطة" : "إضافة نقطة جديدة"}
            </h3>

            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1.5 block">المزود *</label>
              <select value={form.provider_code}
                onChange={e => setForm(f => ({ ...f, provider_code: e.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-sm">
                {PROVIDERS.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1.5 block">اسم النقطة *</label>
              <input type="text" placeholder="نقطة الكريمي - شارع جمال" value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-sm"/>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1.5 block">رقم الهاتف *</label>
              <input type="tel" dir="ltr" placeholder="7XXXXXXXX" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-sm"/>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1.5 block">اسم صاحب الحساب</label>
              <input type="text" placeholder="أحمد محمد" value={form.account_name}
                onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-sm"/>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1.5 block">ملاحظات</label>
              <input type="text" placeholder="متاح من 8ص – 8م" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-sm"/>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                className="h-4 w-4 rounded text-brand-700"/>
              <label htmlFor="is_active" className="text-sm text-[var(--text-2)]">فعّال</label>
            </div>

            {error && <p className="text-sm text-red-500">⚠ {error}</p>}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(false)}
                className="btn-ghost border border-[var(--border)] flex-1 justify-center">
                إلغاء
              </button>
              <button onClick={save} disabled={saving}
                className="btn-primary flex-1 justify-center">
                {saving ? "جارٍ الحفظ..." : editing ? "حفظ التغييرات" : "إضافة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
