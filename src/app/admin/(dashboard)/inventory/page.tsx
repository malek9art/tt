"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { AlertTriangle, Package, TrendingDown, RefreshCw, Download, Upload, X, Plus, Search, Loader2, Wand2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { toast } from "@/store/toastStore";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ProductInfo {
  name_ar: string; sku: string | null; category_id: string | null;
  categories: { name_ar: string } | { name_ar: string }[] | null;
}
interface ProductVariantRow {
  id?:        string;
  sku:        string | null;
  attributes: Record<string, string>;
  products:   ProductInfo | ProductInfo[] | null;
}

interface Movement {
  id: string;
  product_name: string | null;
  movement_type: string;
  quantity: number;
  quantity_before: number | null;
  quantity_after: number | null;
  reason: string | null;
  created_at: string;
}

const MOVEMENT_LABELS: Record<string, { label: string; cls: string }> = {
  initial:  { label: "رصيد افتتاحي", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  add:      { label: "إضافة",        cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  sale:     { label: "بيع",          cls: "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-accent-400" },
  return:   { label: "إرجاع",        cls: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  deduct:   { label: "خصم",          cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  damage:   { label: "تالف",         cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  transfer: { label: "نقل",          cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  adjust:   { label: "تعديل",        cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
};

interface InventoryItem {
  id:                string;
  quantity:          number;
  reserved_quantity: number;
  reorder_level:     number;
  reorder_quantity:  number;
  location:          string | null;
  product_variants:  ProductVariantRow | ProductVariantRow[] | null;
}

function getVariant(item: InventoryItem): ProductVariantRow | null {
  if (!item.product_variants) return null;
  return Array.isArray(item.product_variants)
    ? item.product_variants[0] ?? null
    : item.product_variants;
}

function getProduct(pv: ProductVariantRow | null) {
  if (!pv?.products) return null;
  return Array.isArray(pv.products) ? pv.products[0] ?? null : pv.products;
}

function getCategoryName(prod: ProductInfo | null): string {
  if (!prod?.categories) return "—";
  const cat = Array.isArray(prod.categories) ? prod.categories[0] : prod.categories;
  return cat?.name_ar ?? "—";
}

const EMPTY_QUICK = {
  name_ar: "", sku: "", base_price: "", compare_at_price: "",
  category_id: "", brand_id: "", condition: "new" as "new"|"used_certified",
  status: "published" as "published"|"draft",
  quantity: "1", reorder_level: "5", location: "",
};

export default function InventoryPage() {
  const [items,        setItems]        = useState<InventoryItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState<"all"|"low"|"out">("all");
  const [search,       setSearch]       = useState("");
  const [importing,    setImporting]    = useState(false);
  const [importModal,  setImportModal]  = useState(false);
  const [importResult, setImportResult] = useState<{ created:number; updated:number; skipped:number; errors:string[]; message:string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // إضافة منتج سريعة
  const [quickModal,  setQuickModal]  = useState(false);
  const [quickForm,   setQuickForm]   = useState(EMPTY_QUICK);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickError,  setQuickError]  = useState("");
  const [quickDone,   setQuickDone]   = useState<{ product_id: string; sku: string } | null>(null);
  const [categories,  setCategories]  = useState<{id:string;name_ar:string}[]>([]);
  const [brands,      setBrands]      = useState<{id:string;name:string}[]>([]);
  const [syncing,     setSyncing]     = useState(false);
  const setQ = (k: string, v: string) => { setQuickForm(f => ({ ...f, [k]: v })); setQuickError(""); };

  const [categoryFilter, setCategoryFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await sb
      .from("inventory")
      .select(`
        id, quantity, reserved_quantity, reorder_level, reorder_quantity, location,
        product_variants(id, sku, attributes, products(name_ar, sku, category_id, categories(name_ar)))
      `)
      .order("quantity", { ascending: true });
    setItems((data as InventoryItem[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // تحميل الفئات والماركات — تُستخدم في فلتر المخزون ونافذة الإضافة السريعة وتلميح الاستيراد
  useEffect(() => {
    Promise.all([
      sb.from("categories").select("id,name_ar").eq("is_active", true).order("sort_order"),
      sb.from("brands").select("id,name").eq("is_active", true).order("sort_order"),
    ]).then(([{ data: c }, { data: b }]) => { setCategories(c ?? []); setBrands(b ?? []); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const CATEGORY_HINT = categories.map(c => c.name_ar).join("، ");

  const openQuickAdd = () => {
    setQuickForm(EMPTY_QUICK); setQuickError(""); setQuickDone(null); setQuickModal(true);
  };

  const submitQuickAdd = async (addAnother: boolean) => {
    setQuickSaving(true); setQuickError(""); setQuickDone(null);
    const res = await fetch("/api/admin/inventory/products", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name_ar: quickForm.name_ar,
        sku: quickForm.sku || undefined,
        base_price: Number(quickForm.base_price),
        compare_at_price: quickForm.compare_at_price ? Number(quickForm.compare_at_price) : null,
        category_id: quickForm.category_id || null,
        brand_id: quickForm.brand_id || null,
        condition: quickForm.condition,
        status: quickForm.status,
        quantity: Number(quickForm.quantity) || 0,
        reorder_level: Number(quickForm.reorder_level) || 5,
        location: quickForm.location || null,
      }),
    });
    const d = await res.json();
    setQuickSaving(false);
    if (!res.ok) { setQuickError(d.error ?? "فشلت الإضافة"); return; }
    toast.success(`تمت إضافة «${quickForm.name_ar}» بنجاح`);
    load();
    if (addAnother) {
      setQuickDone({ product_id: d.product_id, sku: d.sku });
      setQuickForm(f => ({ ...EMPTY_QUICK, category_id: f.category_id, brand_id: f.brand_id, status: f.status }));
    } else {
      setQuickDone(null);
      setQuickModal(false);
    }
  };

  const runSync = async () => {
    setSyncing(true);
    const res = await fetch("/api/admin/inventory/sync", { method: "POST" });
    const d = await res.json();
    setSyncing(false);
    if (!res.ok) { toast.error(d.error ?? "فشلت المزامنة"); return; }
    toast.success(d.message);
    load();
  };

  const q = search.trim().toLowerCase();
  const filtered = items.filter(i => {
    if (filter === "low" && !(i.quantity > 0 && i.quantity <= i.reorder_level)) return false;
    if (filter === "out" && i.quantity !== 0) return false;
    const pv   = getVariant(i);
    const prod = getProduct(pv);
    if (categoryFilter && prod?.category_id !== categoryFilter) return false;
    if (q) {
      const hay = `${prod?.name_ar ?? ""} ${pv?.sku ?? ""} ${prod?.sku ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total:   items.length,
    low:     items.filter(i => i.quantity > 0 && i.quantity <= i.reorder_level).length,
    out:     items.filter(i => i.quantity === 0).length,
    healthy: items.filter(i => i.quantity > i.reorder_level).length,
  };

  const updateQty = async (id: string, qty: number) => {
    const item = items.find(i => i.id === id);
    const before = item?.quantity ?? 0;
    if (qty === before || qty < 0) return;
    await sb.from("inventory").update({ quantity: qty }).eq("id", id);
    // قيد حركة تعديل يدوي في سجل المخزون
    const pv = item ? getVariant(item) : null;
    await sb.from("inventory_movements").insert({
      variant_id:      pv?.id ?? null,
      product_name:    getProduct(pv)?.name_ar ?? null,
      movement_type:   qty > before ? "add" : "deduct",
      quantity:        Math.abs(qty - before),
      quantity_before: before,
      quantity_after:  qty,
      reason:          "تعديل يدوي من شاشة المخزون",
      reference_type:  "manual",
    });
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

  // سجل الحركات
  const [movementsModal, setMovementsModal] = useState(false);
  const [movements,      setMovements]      = useState<Movement[]>([]);
  const [movementsBusy,  setMovementsBusy]  = useState(false);

  const openMovements = async () => {
    setMovementsModal(true); setMovementsBusy(true);
    const { data } = await sb
      .from("inventory_movements")
      .select("id, product_name, movement_type, quantity, quantity_before, quantity_after, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    setMovements((data as Movement[]) ?? []);
    setMovementsBusy(false);
  };

  const exportCsv = () => {
    window.location.href = "/api/admin/inventory/export";
  };

  const importCsv = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    const fd = new FormData();
    fd.append("file", file);
    const res  = await fetch("/api/admin/inventory/import", { method: "POST", body: fd });
    const data = await res.json() as typeof importResult;
    setImportResult(data);
    setImporting(false);
    if (res.ok) load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-1)]">إدارة المخزون</h1>
          <p className="text-sm text-[var(--text-muted)]">{items.length} صنف في المخزون</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={openQuickAdd} className="btn-primary gap-2 text-sm">
            <Plus size={15}/> إضافة منتج
          </button>
          <button onClick={runSync} disabled={syncing}
            title="ينشئ صفوف مخزون للمنتجات التي لا تظهر هنا"
            className="btn-ghost border border-[var(--border)] gap-2 text-sm">
            {syncing ? <Loader2 size={14} className="animate-spin"/> : <Wand2 size={14}/>} مزامنة المنتجات
          </button>
          <button onClick={openMovements} className="btn-ghost border border-[var(--border)] gap-2 text-sm">
            📜 سجل الحركات
          </button>
          <button onClick={exportCsv} className="btn-ghost border border-[var(--border)] gap-2 text-sm">
            <Download size={14}/> تصدير
          </button>
          <button onClick={() => { setImportModal(true); setImportResult(null); }}
            className="btn-ghost border border-[var(--border)] gap-2 text-sm">
            <Upload size={14}/> استيراد
          </button>
          <button onClick={load} aria-label="تحديث" className="btn-ghost border border-[var(--border)] gap-2 text-sm">
            <RefreshCw size={14}/>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label:"إجمالي الأصناف", value:stats.total,   color:"bg-blue-50 dark:bg-blue-900/20",   text:"text-blue-600",   icon:Package },
          { label:"مخزون صحي",      value:stats.healthy, color:"bg-green-50 dark:bg-green-900/20", text:"text-green-600",  icon:Package },
          { label:"منخفض",          value:stats.low,     color:"bg-amber-50 dark:bg-amber-900/20", text:"text-amber-600",  icon:TrendingDown },
          { label:"نفد المخزون",    value:stats.out,     color:"bg-red-50 dark:bg-red-900/20",     text:"text-red-600",    icon:AlertTriangle },
        ].map(({ label, value, color, text, icon:Icon }) => (
          <div key={label} className={`card-base p-4 ${color}`}>
            <Icon size={18} className={`mb-2 ${text}`}/>
            <p className={`text-xl font-bold ${text}`}>{value}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {[
          { v:"all", l:"الكل" },
          { v:"low", l:`منخفض (${stats.low})` },
          { v:"out", l:`نفد (${stats.out})` },
        ].map(({ v, l }) => (
          <button key={v} onClick={() => setFilter(v as typeof filter)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === v ? "bg-brand-700 text-white" : "border border-[var(--border)] text-[var(--text-2)] hover:border-brand-300"
            }`}>{l}</button>
        ))}
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors">
          <option value="">كل الفئات</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
        </select>
        <div className="relative mr-auto min-w-52 flex-1 sm:flex-none">
          <Search size={14} className="absolute top-1/2 -translate-y-1/2 end-3 text-[var(--text-muted)] pointer-events-none"/>
          <input type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو SKU..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] pe-8 ps-3 py-1.5 text-xs text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors"/>
        </div>
      </div>

      <div className="card-base overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4,5].map(i=><div key={i} className="skeleton h-12 w-full"/>)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={40} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]"/>
            <p className="font-semibold text-[var(--text-1)] mb-1">
              {q ? "لا نتائج لبحثك" : "لا توجد أصناف في المخزون"}
            </p>
            {!q && (
              <>
                <p className="text-sm text-[var(--text-muted)] mb-5">
                  أضف منتجاً جديداً، أو شغّل المزامنة لجلب منتجاتك الحالية إلى المخزون
                </p>
                <div className="flex justify-center gap-2">
                  <button onClick={openQuickAdd} className="btn-primary gap-2 text-sm">
                    <Plus size={15}/> إضافة منتج
                  </button>
                  <button onClick={runSync} disabled={syncing}
                    className="btn-ghost border border-[var(--border)] gap-2 text-sm">
                    {syncing ? <Loader2 size={14} className="animate-spin"/> : <Wand2 size={14}/>} مزامنة المنتجات
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-page)] border-b border-[var(--border)]">
                <tr>
                  {["المنتج","الفئة","SKU","الكمية","محجوز","متاح","حد إعادة الطلب","الحالة"].map(h=>(
                    <th key={h} className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map(item => {
                  const pv   = getVariant(item);
                  const prod = getProduct(pv);
                  const name = prod?.name_ar ?? "—";
                  const sku  = pv?.sku ?? prod?.sku ?? "—";
                  const avail  = item.quantity - item.reserved_quantity;
                  const isOut  = item.quantity === 0;
                  const isLow  = !isOut && item.quantity <= item.reorder_level;
                  return (
                    <tr key={item.id} className="hover:bg-[var(--bg-page)] transition-colors">
                      <td className="px-4 py-3 font-medium text-[var(--text-1)] max-w-[180px] truncate">{name}</td>
                      <td className="px-4 py-3 text-[var(--text-2)] whitespace-nowrap">{getCategoryName(prod)}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)] font-mono text-xs" dir="ltr">{sku}</td>
                      <td className="px-4 py-3">
                        <input type="number" min="0"
                          defaultValue={item.quantity}
                          onBlur={e => updateQty(item.id, Number(e.target.value))}
                          className="w-20 rounded border border-[var(--border)] bg-[var(--bg-page)] px-2 py-1 text-center text-sm text-[var(--text-1)] outline-none focus:border-brand-500"
                          dir="ltr"/>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-2)]">{item.reserved_quantity}</td>
                      <td className="px-4 py-3 font-semibold text-[var(--text-1)]">{avail}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{item.reorder_level}</td>
                      <td className="px-4 py-3">
                        <span className={`badge text-xs px-2.5 py-1 ${
                          isOut  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : isLow ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          :         "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        }`}>
                          {isOut ? "نفد" : isLow ? "منخفض" : "متوفر"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Movements Log Modal */}
      {movementsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 space-y-4 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[var(--text-1)]">📜 سجل حركات المخزون <span className="text-xs text-[var(--text-muted)] font-normal">(آخر 50 حركة)</span></h2>
              <button onClick={() => setMovementsModal(false)} aria-label="إغلاق"
                className="text-[var(--text-muted)] hover:text-[var(--text-1)]">
                <X size={18}/>
              </button>
            </div>

            {movementsBusy ? (
              <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="skeleton h-12 rounded-lg"/>)}</div>
            ) : movements.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--text-muted)]">
                لا توجد حركات بعد — كل بيع وتعديل وإرجاع سيُسجَّل هنا تلقائياً
              </p>
            ) : (
              <div className="overflow-y-auto divide-y divide-[var(--border)] -mx-2">
                {movements.map(m => {
                  const t = MOVEMENT_LABELS[m.movement_type] ?? MOVEMENT_LABELS.adjust;
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-2 py-2.5 text-sm">
                      <span className={`badge shrink-0 text-[11px] px-2 py-0.5 ${t.cls}`}>{t.label}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--text-1)] truncate">{m.product_name ?? "—"}</p>
                        {m.reason && <p className="text-[11px] text-[var(--text-muted)] truncate">{m.reason}</p>}
                      </div>
                      <div className="shrink-0 text-left" dir="ltr">
                        <p className="font-bold text-[var(--text-1)]">
                          {m.quantity_before ?? "?"} → {m.quantity_after ?? "?"}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {new Date(m.created_at).toLocaleString("ar-YE", { dateStyle: "short", timeStyle: "short" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Add Product Modal */}
      {quickModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xl">
            <div className="flex items-center justify-between p-6 pb-4 shrink-0">
              <h2 className="font-bold text-[var(--text-1)] flex items-center gap-2">
                <Plus size={18} className="text-brand-700"/> إضافة منتج سريعة
              </h2>
              <button onClick={() => setQuickModal(false)} aria-label="إغلاق"
                className="text-[var(--text-muted)] hover:text-[var(--text-1)]">
                <X size={18}/>
              </button>
            </div>

            <div className="overflow-y-auto px-6 space-y-4">
              {quickDone && (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-2.5 text-sm text-green-700 dark:text-green-400">
                  <span>✓ أُضيف المنتج السابق (SKU: <b dir="ltr">{quickDone.sku}</b>)</span>
                  <Link href={`/admin/products/${quickDone.product_id}`} target="_blank"
                    className="flex items-center gap-1 text-xs font-semibold underline shrink-0">
                    أضف صوراً <ExternalLink size={11}/>
                  </Link>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">اسم المنتج *</label>
                  <input type="text" value={quickForm.name_ar} autoFocus
                    placeholder="مثال: iPhone 17 Pro Max 256GB"
                    onChange={e => setQ("name_ar", e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500"/>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">السعر (﷼) *</label>
                  <input type="number" min="0" dir="ltr" value={quickForm.base_price}
                    onChange={e => setQ("base_price", e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500"/>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">السعر قبل الخصم</label>
                  <input type="number" min="0" dir="ltr" value={quickForm.compare_at_price}
                    placeholder="اختياري"
                    onChange={e => setQ("compare_at_price", e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500"/>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">SKU</label>
                  <input type="text" dir="ltr" value={quickForm.sku}
                    placeholder="يولَّد تلقائياً إن تُرك فارغاً"
                    onChange={e => setQ("sku", e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm font-mono text-[var(--text-1)] outline-none focus:border-brand-500"/>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الفئة</label>
                  <select value={quickForm.category_id} onChange={e => setQ("category_id", e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500">
                    <option value="">بدون فئة</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الماركة</label>
                  <select value={quickForm.brand_id} onChange={e => setQ("brand_id", e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500">
                    <option value="">بدون ماركة</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الحالة</label>
                  <select value={quickForm.condition} onChange={e => setQ("condition", e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500">
                    <option value="new">جديد</option>
                    <option value="used_certified">مستعمل مفحوص</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الكمية الابتدائية</label>
                  <input type="number" min="0" dir="ltr" value={quickForm.quantity}
                    onChange={e => setQ("quantity", e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500"/>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">حد إعادة الطلب</label>
                  <input type="number" min="0" dir="ltr" value={quickForm.reorder_level}
                    onChange={e => setQ("reorder_level", e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500"/>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">موقع التخزين</label>
                  <input type="text" value={quickForm.location}
                    placeholder="رف A3، الدرج 2..."
                    onChange={e => setQ("location", e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500"/>
                </div>
                <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-1)]">نشر مباشرة في المتجر</p>
                    <p className="text-[11px] text-[var(--text-muted)]">أوقفه ليُحفظ كمسودة تكملها لاحقاً بالصور والتفاصيل</p>
                  </div>
                  <button type="button" role="switch" aria-checked={quickForm.status === "published"}
                    onClick={() => setQ("status", quickForm.status === "published" ? "draft" : "published")}
                    className={`relative h-6 w-11 rounded-full transition-colors ${quickForm.status === "published" ? "bg-brand-700" : "bg-[var(--border)]"}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${quickForm.status === "published" ? "start-0.5" : "start-[22px]"}`}/>
                  </button>
                </div>
              </div>

              {quickError && <p className="text-sm text-red-500">⚠ {quickError}</p>}
            </div>

            <div className="p-6 pt-4 shrink-0 space-y-3">
              <div className="flex gap-2">
                <button onClick={() => submitQuickAdd(false)} disabled={quickSaving || !quickForm.name_ar || !quickForm.base_price}
                  className="btn-primary flex-1 justify-center gap-2 disabled:opacity-50">
                  {quickSaving ? <><Loader2 size={14} className="animate-spin"/> جارٍ الحفظ...</> : "حفظ وإغلاق"}
                </button>
                <button onClick={() => submitQuickAdd(true)} disabled={quickSaving || !quickForm.name_ar || !quickForm.base_price}
                  className="btn-ghost border border-[var(--border)] flex-1 justify-center disabled:opacity-50">
                  حفظ وإضافة آخر
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] text-center">
                لإضافة صور وخيارات (ألوان/سعات) افتح المنتج من صفحة المنتجات بعد الحفظ
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xl">
            <div className="flex items-center justify-between p-6 pb-4 shrink-0">
              <h2 className="font-bold text-[var(--text-1)]">استيراد/إنشاء منتجات من Excel</h2>
              <button onClick={() => setImportModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-1)]">
                <X size={18}/>
              </button>
            </div>

            <div className="overflow-y-auto px-6 space-y-4">
              <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <p className="font-semibold">تعليمات الاستيراد:</p>
                <p>• اترك <strong>SKU</strong> فارغاً لإنشاء منتج جديد كامل — أو ضع SKU منتج موجود لتحديث كل بياناته</p>
                <p>• الأعمدة: اسم المنتج، الاسم الإنجليزي، SKU، الوصف، الفئة، العلامة التجارية، السعر، السعر قبل الخصم، الحالة، حالة النشر، النوع، الضمان، الوسوم، الكمية، حد إعادة الطلب، كمية إعادة الطلب، الموقع</p>
                <p>• عمود <strong>الفئة</strong> يجب أن يطابق أحد الأسماء التالية بالضبط: {CATEGORY_HINT}</p>
                <p>• الوسوم المتعددة داخل الخلية الواحدة تُفصل بفاصلة منقوطة (؛)</p>
                <p>• صيغ مقبولة: CSV أو XLSX مباشرة</p>
                <p>• يقبل النظام أيضاً كشوف مخزون بأعمدة مختلفة (رقم الصنف، الصنف، الاسم الاجنبي، الكمية المتوفرة، المخزن...) — يستنتج تلقائياً الفئة والعلامة التجارية عند غيابها من الملف</p>
                <p>• <a href="/api/admin/inventory/template" className="underline font-semibold">📥 حمّل قالب جاهز بأمثلة</a> — أو <a href="/api/admin/inventory/export" className="underline font-semibold">📤 صدّر كل منتجاتك الحالية</a> لتعديلها جماعياً ثم إعادة رفعها</p>
              </div>

              <div
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] p-8 cursor-pointer hover:border-brand-500 transition-colors">
                <Upload size={28} className="text-[var(--text-muted)]"/>
                <p className="text-sm text-[var(--text-muted)]">انقر لاختيار ملف CSV أو Excel</p>
                <input ref={fileRef} type="file"
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) importCsv(f); }}/>
              </div>

              {importing && (
                <p className="text-center text-sm text-[var(--text-muted)]">
                  <span className="animate-spin inline-block mr-1">⏳</span> جارٍ الاستيراد...
                </p>
              )}

              {importResult && (
                <div className={`rounded-xl p-3 text-sm space-y-1 ${
                  importResult.errors?.length
                    ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 text-amber-700 dark:text-amber-300"
                    : "bg-green-50 dark:bg-green-900/20 border border-green-200 text-green-700 dark:text-green-300"
                }`}>
                  <p className="font-semibold">{importResult.message}</p>
                  {importResult.created > 0 && <p>✓ أُنشئ {importResult.created} منتج جديد</p>}
                  {importResult.updated > 0 && <p>✓ تم تحديث {importResult.updated} منتج</p>}
                  {importResult.skipped > 0 && <p>↷ تم تخطي {importResult.skipped} صنف</p>}
                  {importResult.errors?.map((e, i) => (
                    <p key={i} className="text-xs opacity-80">⚠ {e}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end p-6 pt-4 shrink-0">
              <button onClick={() => setImportModal(false)}
                className="btn-ghost border border-[var(--border)] text-sm px-4 py-2 rounded-lg">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
