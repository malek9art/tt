"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, RotateCcw, Ban, Loader2, FolderTree } from "lucide-react";

interface Category {
  id: string;
  parent_id: string | null;
  name_ar: string;
  name_en: string | null;
  slug: string;
  description: string | null;
  image_url: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

const EMPTY_FORM = {
  name_ar: "", name_en: "", slug: "", description: "",
  image_url: "", icon: "", sort_order: 0,
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState<Category | null>(null);
  const [form,       setForm]       = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/categories");
    const d   = await res.json();
    setCategories(d.categories ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({
      name_ar: c.name_ar, name_en: c.name_en ?? "", slug: c.slug,
      description: c.description ?? "", image_url: c.image_url ?? "",
      icon: c.icon ?? "", sort_order: c.sort_order,
    });
    setError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name_ar.trim()) { setError("أدخل اسم الفئة"); return; }
    setSaving(true); setError("");

    const url    = editing ? `/api/admin/categories/${editing.id}` : "/api/admin/categories";
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

  const toggleActive = async (c: Category) => {
    const res = await fetch(`/api/admin/categories/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !c.is_active }),
    });
    if (res.ok) setCategories(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !c.is_active } : x));
  };

  const iCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">فئات المنتجات</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{categories.length} فئة</p>
        </div>
        <button onClick={openAdd} className="btn-primary gap-1.5 text-sm">
          <Plus size={15}/> فئة جديدة
        </button>
      </div>

      {showForm && (
        <div className="card-base p-5 space-y-4 mb-4">
          <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3">
            {editing ? "تعديل الفئة" : "فئة جديدة"}
          </h2>
          {error && <p className="text-sm text-red-500">⚠ {error}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الاسم (عربي) *</label>
              <input type="text" value={form.name_ar}
                onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} className={iCls}/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الاسم (إنجليزي)</label>
              <input type="text" dir="ltr" value={form.name_en}
                onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} className={iCls}/>
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
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">أيقونة (رمز تعبيري، اختياري)</label>
              <input type="text" placeholder="📱" value={form.icon}
                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} className={iCls}/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">رابط صورة (اختياري)</label>
              <input type="text" dir="ltr" value={form.image_url}
                onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} className={iCls}/>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الوصف (اختياري)</label>
              <input type="text" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={iCls}/>
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
      ) : categories.length === 0 ? (
        <div className="card-base py-16 text-center">
          <FolderTree size={40} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]"/>
          <p className="font-semibold text-[var(--text-1)] mb-1">لا توجد فئات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map(c => (
            <div key={c.id} className={`card-base p-4 flex items-center justify-between gap-3 ${!c.is_active ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900/30 text-lg">
                  {c.icon || "🗂️"}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-1)]">
                    {c.name_ar}
                    {!c.is_active && <span className="ms-2 text-[10px] text-red-500">(معطّلة)</span>}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]" dir="ltr">{c.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => openEdit(c)} className="text-xs text-brand-700 hover:text-brand-900 transition-colors flex items-center gap-1">
                  <Pencil size={12}/> تعديل
                </button>
                <button onClick={() => toggleActive(c)}
                  className={`text-xs flex items-center gap-1 transition-colors ${c.is_active ? "text-red-400 hover:text-red-600" : "text-green-600 hover:text-green-700"}`}>
                  {c.is_active ? <><Ban size={12}/> تعطيل</> : <><RotateCcw size={12}/> تفعيل</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
