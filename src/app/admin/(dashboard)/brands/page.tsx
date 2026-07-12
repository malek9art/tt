"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, RotateCcw, Ban, Loader2, Tag } from "lucide-react";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  sort_order: number;
  is_active: boolean;
}

const EMPTY_FORM = { name: "", slug: "", logo_url: "", sort_order: 0 };

export default function BrandsPage() {
  const [brands,   setBrands]   = useState<Brand[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<Brand | null>(null);
  const [form,     setForm]     = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/brands");
    const d   = await res.json();
    setBrands(d.brands ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  };

  const openEdit = (b: Brand) => {
    setEditing(b);
    setForm({ name: b.name, slug: b.slug, logo_url: b.logo_url ?? "", sort_order: b.sort_order });
    setError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("أدخل اسم العلامة التجارية"); return; }
    setSaving(true); setError("");

    const url    = editing ? `/api/admin/brands/${editing.id}` : "/api/admin/brands";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "فشل الحفظ");
      setSaving(false);
      return;
    }
    setShowForm(false);
    setSaving(false);
    load();
  };

  const toggleActive = async (b: Brand) => {
    const res = await fetch(`/api/admin/brands/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !b.is_active }),
    });
    if (res.ok) setBrands(prev => prev.map(x => x.id === b.id ? { ...x, is_active: !b.is_active } : x));
  };

  const iCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">العلامات التجارية</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{brands.length} علامة</p>
        </div>
        <button onClick={openAdd} className="btn-primary gap-1.5 text-sm">
          <Plus size={15}/> علامة جديدة
        </button>
      </div>

      {showForm && (
        <div className="card-base p-5 space-y-4 mb-4">
          <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3">
            {editing ? "تعديل العلامة التجارية" : "علامة تجارية جديدة"}
          </h2>
          {error && <p className="text-sm text-red-500">⚠ {error}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الاسم *</label>
              <input type="text" dir="ltr" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={iCls}/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الرابط (slug)</label>
              <input type="text" dir="ltr" placeholder="يُنشأ تلقائياً إن تُرك فارغاً" value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className={iCls}/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">ترتيب العرض</label>
              <input type="number" value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className={iCls}/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">رابط شعار (اختياري)</label>
              <input type="text" dir="ltr" value={form.logo_url}
                onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} className={iCls}/>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving} className="btn-primary gap-2">
              {saving ? <><Loader2 size={14} className="animate-spin"/> حفظ...</> : <>حفظ</>}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-ghost border border-[var(--border)]">إلغاء</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-16 w-full rounded-xl"/>)}</div>
      ) : brands.length === 0 ? (
        <div className="card-base py-16 text-center">
          <Tag size={40} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]"/>
          <p className="font-semibold text-[var(--text-1)] mb-1">لا توجد علامات تجارية</p>
        </div>
      ) : (
        <div className="space-y-2">
          {brands.map(b => (
            <div key={b.id} className={`card-base p-4 flex items-center justify-between gap-3 ${!b.is_active ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900/30 text-lg">
                  🏷️
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-1)]">
                    {b.name}
                    {!b.is_active && <span className="ms-2 text-[10px] text-red-500">(معطّلة)</span>}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]" dir="ltr">{b.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => openEdit(b)} className="text-xs text-brand-700 hover:text-brand-900 transition-colors flex items-center gap-1">
                  <Pencil size={12}/> تعديل
                </button>
                <button onClick={() => toggleActive(b)}
                  className={`text-xs flex items-center gap-1 transition-colors ${b.is_active ? "text-red-400 hover:text-red-600" : "text-green-600 hover:text-green-700"}`}>
                  {b.is_active ? <><Ban size={12}/> تعطيل</> : <><RotateCcw size={12}/> تفعيل</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
