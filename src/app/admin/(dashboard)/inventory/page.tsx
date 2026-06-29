"use client";
import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Package, AlertTriangle, Search } from "lucide-react";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface InventoryItem {
  id: string;
  quantity: number;
  reserved: number;
  reorder_level: number;
  warehouse_id: string;
  product_variants: {
    sku: string | null;
    attributes: Record<string,string>;
    products: { name_ar: string; sku: string | null } | null;
  } | null;
}

export default function InventoryPage() {
  const [items,   setItems]   = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await sb
      .from("inventory")
      .select(`
        id, quantity, reserved, reorder_level, warehouse_id,
        product_variants(
          sku, attributes,
          products(name_ar, sku)
        )
      `)
      .order("quantity", { ascending: true });
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(i => {
    const name = i.product_variants?.products?.name_ar ?? "";
    return name.includes(search) || (i.product_variants?.sku ?? "").includes(search);
  });

  const lowStock = items.filter(i => i.quantity <= i.reorder_level);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-1)]">المخزون</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {items.length} منتج · {lowStock.length} منخفض المخزون
          </p>
        </div>
      </div>

      {/* تنبيه المخزون المنخفض */}
      {lowStock.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-amber-600" />
            <p className="font-semibold text-amber-700 dark:text-amber-400">
              {lowStock.length} منتج بحاجة للتوريد
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.slice(0, 5).map(i => (
              <span key={i.id} className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full">
                {i.product_variants?.products?.name_ar ?? "—"} ({i.quantity})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* بحث */}
      <div className="card-base p-4">
        <div className="relative">
          <Search size={15} className="absolute top-2.5 end-3 text-[var(--text-muted)]" />
          <input
            type="text" placeholder="ابحث بالاسم أو SKU..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] pe-9 px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors"
          />
        </div>
      </div>

      {/* الجدول */}
      <div className="card-base overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-12 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={40} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]" />
            <p className="text-[var(--text-muted)]">لا توجد بيانات مخزون بعد</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">أضف منتجات وأسعارها لتظهر هنا</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-page)] border-b border-[var(--border)]">
                <tr>
                  {["المنتج","SKU","المتاح","المحجوز","حد إعادة الطلب","الحالة"].map(h => (
                    <th key={h} className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map(item => {
                  const avail   = item.quantity - item.reserved;
                  const isLow   = item.quantity <= item.reorder_level;
                  const isEmpty = item.quantity === 0;
                  return (
                    <tr key={item.id} className="hover:bg-[var(--bg-page)] transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--text-1)]">
                          {item.product_variants?.products?.name_ar ?? "—"}
                        </p>
                        {item.product_variants?.attributes && Object.keys(item.product_variants.attributes).length > 0 && (
                          <p className="text-xs text-[var(--text-muted)]">
                            {Object.values(item.product_variants.attributes as Record<string,string>).join(" / ")}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)] text-xs" dir="ltr">
                        {item.product_variants?.sku ?? item.product_variants?.products?.sku ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-bold text-[var(--text-1)]">{avail}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{item.reserved}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{item.reorder_level}</td>
                      <td className="px-4 py-3">
                        <span className={`badge px-2.5 py-1 text-xs ${
                          isEmpty ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : isLow ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        }`}>
                          {isEmpty ? "نفد" : isLow ? "منخفض" : "كافٍ"}
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
    </div>
  );
}
