"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { AlertTriangle, Package, TrendingDown, RefreshCw, Download, Upload, X } from "lucide-react";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ProductVariantRow {
  sku:        string | null;
  attributes: Record<string, string>;
  products:   { name_ar: string; sku: string | null } | { name_ar: string; sku: string | null }[] | null;
}

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

export default function InventoryPage() {
  const [items,        setItems]        = useState<InventoryItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState<"all"|"low"|"out">("all");
  const [importing,    setImporting]    = useState(false);
  const [importModal,  setImportModal]  = useState(false);
  const [importResult, setImportResult] = useState<{ updated:number; skipped:number; errors:string[]; message:string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await sb
      .from("inventory")
      .select(`
        id, quantity, reserved_quantity, reorder_level, reorder_quantity, location,
        product_variants(sku, attributes, products(name_ar, sku))
      `)
      .order("quantity", { ascending: true });
    setItems((data as InventoryItem[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(i => {
    if (filter === "low") return i.quantity > 0 && i.quantity <= i.reorder_level;
    if (filter === "out") return i.quantity === 0;
    return true;
  });

  const stats = {
    total:   items.length,
    low:     items.filter(i => i.quantity > 0 && i.quantity <= i.reorder_level).length,
    out:     items.filter(i => i.quantity === 0).length,
    healthy: items.filter(i => i.quantity > i.reorder_level).length,
  };

  const updateQty = async (id: string, qty: number) => {
    await sb.from("inventory").update({ quantity: qty }).eq("id", id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
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
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="btn-ghost border border-[var(--border)] gap-2 text-sm">
            <Download size={14}/> تصدير Excel
          </button>
          <button onClick={() => { setImportModal(true); setImportResult(null); }}
            className="btn-ghost border border-[var(--border)] gap-2 text-sm">
            <Upload size={14}/> استيراد Excel
          </button>
          <button onClick={load} className="btn-ghost border border-[var(--border)] gap-2 text-sm">
            <RefreshCw size={14}/> تحديث
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

      <div className="flex gap-2">
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
      </div>

      <div className="card-base overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4,5].map(i=><div key={i} className="skeleton h-12 w-full"/>)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={40} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]"/>
            <p className="text-[var(--text-muted)]">لا توجد أصناف</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-page)] border-b border-[var(--border)]">
                <tr>
                  {["المنتج","SKU","الكمية","محجوز","متاح","حد إعادة الطلب","الحالة"].map(h=>(
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

      {/* Import Modal */}
      {importModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[var(--text-1)]">استيراد المخزون من Excel</h2>
              <button onClick={() => setImportModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-1)]">
                <X size={18}/>
              </button>
            </div>

            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <p className="font-semibold">تعليمات الاستيراد:</p>
              <p>• يجب أن يحتوي الملف على عمود <strong>SKU</strong></p>
              <p>• الأعمدة المدعومة: الكمية، الموقع، حد إعادة الطلب، كمية إعادة الطلب</p>
              <p>• صيغ مقبولة: CSV أو XLSX (محوّل لـ CSV)</p>
              <p>• <a href="/api/admin/inventory/export" className="underline">حمّل ملف التصدير</a> كنموذج للاستيراد</p>
            </div>

            <div
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] p-8 cursor-pointer hover:border-brand-500 transition-colors">
              <Upload size={28} className="text-[var(--text-muted)]"/>
              <p className="text-sm text-[var(--text-muted)]">انقر لاختيار ملف CSV</p>
              <input ref={fileRef} type="file" accept=".csv,text/csv"
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
                <p>✓ تم تحديث {importResult.updated} صنف</p>
                {importResult.skipped > 0 && <p>↷ تم تخطي {importResult.skipped} صنف (SKU غير موجود)</p>}
                {importResult.errors?.map((e, i) => (
                  <p key={i} className="text-xs opacity-80">⚠ {e}</p>
                ))}
              </div>
            )}

            <div className="flex gap-2 justify-end">
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
