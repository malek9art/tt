"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { Plus, Trash2, Loader2, ArrowRight, Truck, Ban, RotateCcw } from "lucide-react";
import { GOVERNORATES } from "@/lib/governorates";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Rule {
  id: string;
  governorate: string;
  category_id: string | null;
  fee: number;
  is_active: boolean;
  categories: { name_ar: string } | { name_ar: string }[] | null;
}

interface Category { id: string; name_ar: string; }

const EMPTY_FORM = { governorate: "تعز", category_id: "", fee: 2000 };

function categoryName(r: Rule): string {
  if (!r.categories) return "كل الفئات";
  const c = Array.isArray(r.categories) ? r.categories[0] : r.categories;
  return c?.name_ar ?? "كل الفئات";
}

export default function ShippingRulesPage() {
  const [rules,      setRules]      = useState<Rule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/shipping-rules");
    const d   = await res.json();
    setRules(d.rules ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    sb.from("categories").select("id,name_ar").eq("is_active", true).order("sort_order")
      .then(({ data }) => setCategories(data ?? []));
  }, [load]);

  const handleAdd = async () => {
    setSaving(true); setError("");
    const res = await fetch("/api/admin/shipping-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, category_id: form.category_id || null, fee: Number(form.fee) }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "فشل الحفظ");
      setSaving(false);
      return;
    }
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
    load();
  };

  const toggleActive = async (r: Rule) => {
    const res = await fetch(`/api/admin/shipping-rules/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !r.is_active }),
    });
    if (res.ok) setRules(prev => prev.map(x => x.id === r.id ? { ...x, is_active: !r.is_active } : x));
  };

  const updateFee = async (r: Rule, fee: number) => {
    const res = await fetch(`/api/admin/shipping-rules/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fee }),
    });
    if (res.ok) setRules(prev => prev.map(x => x.id === r.id ? { ...x, fee } : x));
  };

  const remove = async (r: Rule) => {
    if (!confirm("حذف هذه القاعدة؟")) return;
    const res = await fetch(`/api/admin/shipping-rules/${r.id}`, { method: "DELETE" });
    if (res.ok) setRules(prev => prev.filter(x => x.id !== r.id));
  };

  const iCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/settings" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-2)] hover:border-brand-300 transition-colors">
            <ArrowRight size={16}/>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-1)]">رسوم الشحن</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">حسب المحافظة وفئة المنتج — الرسم الأعلى المطابق لعناصر السلة هو ما يُطبَّق</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary gap-1.5 text-sm">
          <Plus size={15}/> قاعدة جديدة
        </button>
      </div>

      {showForm && (
        <div className="card-base p-5 space-y-4">
          <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3">قاعدة شحن جديدة</h2>
          {error && <p className="text-sm text-red-500">⚠ {error}</p>}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">المحافظة</label>
              <select value={form.governorate} onChange={e => setForm(f => ({ ...f, governorate: e.target.value }))} className={iCls}>
                {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الفئة</label>
              <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className={iCls}>
                <option value="">كل الفئات</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">رسم الشحن (YER)</label>
              <input type="number" dir="ltr" value={form.fee}
                onChange={e => setForm(f => ({ ...f, fee: Number(e.target.value) }))} className={iCls}/>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleAdd} disabled={saving} className="btn-primary gap-2">
              {saving ? <><Loader2 size={14} className="animate-spin"/> حفظ...</> : <>حفظ</>}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-ghost border border-[var(--border)]">إلغاء</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-14 w-full rounded-xl"/>)}</div>
      ) : rules.length === 0 ? (
        <div className="card-base py-16 text-center">
          <Truck size={40} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]"/>
          <p className="font-semibold text-[var(--text-1)] mb-1">لا توجد قواعد شحن</p>
          <p className="text-sm text-[var(--text-muted)]">بدون قواعد، يُطبَّق رسم افتراضي ثابت على كل الطلبات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map(r => (
            <div key={r.id} className={`card-base p-4 flex items-center justify-between gap-3 flex-wrap ${!r.is_active ? "opacity-50" : ""}`}>
              <div>
                <p className="text-sm font-medium text-[var(--text-1)]">
                  {r.governorate} <span className="text-[var(--text-muted)]">·</span> {categoryName(r)}
                  {!r.is_active && <span className="ms-2 text-[10px] text-red-500">(معطّلة)</span>}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <input type="number" dir="ltr" defaultValue={r.fee}
                  onBlur={e => { const v = Number(e.target.value); if (v !== r.fee) updateFee(r, v); }}
                  className="w-28 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-2 py-1.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500"/>
                <button onClick={() => toggleActive(r)}
                  className={`text-xs flex items-center gap-1 transition-colors ${r.is_active ? "text-red-400 hover:text-red-600" : "text-green-600 hover:text-green-700"}`}>
                  {r.is_active ? <><Ban size={12}/> تعطيل</> : <><RotateCcw size={12}/> تفعيل</>}
                </button>
                <button onClick={() => remove(r)} className="text-xs text-red-400 hover:text-red-600 transition-colors flex items-center gap-1">
                  <Trash2 size={12}/> حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
