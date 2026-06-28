"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Search, Filter, Edit, Trash2, Eye, MoreVertical, Package } from "lucide-react";

const STATUS_OPTS = [
  { value: "", label: "الكل" },
  { value: "published", label: "منشور" },
  { value: "draft",     label: "مسودة" },
  { value: "archived",  label: "مؤرشف" },
];

const STATUS_BADGE: Record<string, string> = {
  published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  draft:     "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  archived:  "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_AR: Record<string, string> = {
  published: "منشور", draft: "مسودة", archived: "مؤرشف",
};

interface Product {
  id: string; sku: string|null; name_ar: string; slug: string;
  status: string; base_price: number; currency: string; is_featured: boolean;
  categories: { name_ar: string }|null; brands: { name: string }|null;
  product_images: { url: string; is_primary: boolean }[];
  product_variants: { id: string; price: number; is_active: boolean }[];
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [status,   setStatus]   = useState("");
  const [page,     setPage]     = useState(1);
  const [deleting, setDeleting] = useState<string|null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(page), limit: "15" });
    if (status) q.set("status", status);
    if (search) q.set("q", search);
    const r = await fetch(`/api/admin/products?${q}`);
    const d = await r.json();
    setProducts(d.products ?? []);
    setTotal(d.total ?? 0);
    setLoading(false);
  }, [page, status, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل تريد حذف "${name}"؟ لا يمكن التراجع.`)) return;
    setDeleting(id);
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    setDeleting(null);
    load();
  };

  const toggleStatus = async (id: string, current: string) => {
    const next = current === "published" ? "draft" : "published";
    await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    load();
  };

  const totalPages = Math.ceil(total / 15);
  const primaryImg = (p: Product) =>
    p.product_images?.find(i => i.is_primary)?.url ?? p.product_images?.[0]?.url;

  return (
    <div className="space-y-5">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-1)]">المنتجات</h1>
          <p className="text-sm text-[var(--text-muted)]">{total.toLocaleString("ar")} منتج إجمالاً</p>
        </div>
        <Link href="/admin/products/new" className="btn-primary gap-2">
          <Plus size={16} /> إضافة منتج
        </Link>
      </div>

      {/* شريط البحث والفلتر */}
      <div className="card-base p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute top-2.5 end-3 text-[var(--text-muted)]" />
          <input
            type="text" placeholder="ابحث بالاسم أو SKU..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] pe-9 px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors" />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[var(--text-muted)]" />
          <div className="flex gap-1">
            {STATUS_OPTS.map(o => (
              <button key={o.value}
                onClick={() => { setStatus(o.value); setPage(1); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${status === o.value ? "bg-brand-700 text-white" : "border border-[var(--border)] text-[var(--text-2)] hover:border-brand-300"}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* جدول المنتجات */}
      <div className="card-base overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16 w-full" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center">
            <Package size={48} className="mx-auto mb-4 opacity-20 text-[var(--text-muted)]" />
            <p className="font-semibold text-[var(--text-1)]">لا توجد منتجات</p>
            <Link href="/admin/products/new" className="btn-primary mt-4 inline-flex">
              <Plus size={16} /> أضف أول منتج
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-page)] border-b border-[var(--border)]">
                  <tr>
                    {["المنتج","الفئة","السعر","الحالة","المخزون",""].map(h => (
                      <th key={h} className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {products.map(p => {
                    const img = primaryImg(p);
                    const activeVariants = p.product_variants?.filter(v => v.is_active) ?? [];
                    const minPrice = activeVariants.length
                      ? Math.min(...activeVariants.map(v => v.price))
                      : p.base_price;
                    return (
                      <tr key={p.id} className="hover:bg-[var(--bg-page)] transition-colors group">
                        {/* المنتج */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-brand-50">
                              {img
                                ? <Image src={img} alt={p.name_ar} fill sizes="40px" className="object-cover" />
                                : <div className="flex h-full w-full items-center justify-center text-lg">📱</div>}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-[var(--text-1)] line-clamp-1">{p.name_ar}</p>
                              {p.sku && <p className="text-xs text-[var(--text-muted)]" dir="ltr">{p.sku}</p>}
                            </div>
                          </div>
                        </td>
                        {/* الفئة */}
                        <td className="px-4 py-3 text-sm text-[var(--text-2)]">
                          {p.categories?.name_ar ?? "—"}
                        </td>
                        {/* السعر */}
                        <td className="px-4 py-3 font-semibold text-brand-700 dark:text-accent-400 whitespace-nowrap">
                          {new Intl.NumberFormat("ar-YE").format(minPrice)} ﷼
                          {activeVariants.length > 1 && (
                            <span className="block text-xs text-[var(--text-muted)] font-normal">
                              {activeVariants.length} خيار
                            </span>
                          )}
                        </td>
                        {/* الحالة */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleStatus(p.id, p.status)}
                            className={`badge px-2.5 py-1 cursor-pointer hover:opacity-80 transition-opacity ${STATUS_BADGE[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                            {STATUS_AR[p.status] ?? p.status}
                          </button>
                        </td>
                        {/* المخزون */}
                        <td className="px-4 py-3 text-sm text-[var(--text-2)]">
                          {activeVariants.length > 0 ? `${activeVariants.length} متغيّر` : "بلا متغيّرات"}
                        </td>
                        {/* الإجراءات */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/products/${p.slug}`} target="_blank"
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-2)] hover:bg-[var(--border)] transition-colors" title="عرض">
                              <Eye size={14} />
                            </Link>
                            <Link href={`/admin/products/${p.id}`}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-2)] hover:bg-[var(--border)] transition-colors" title="تعديل">
                              <Edit size={14} />
                            </Link>
                            <button
                              onClick={() => handleDelete(p.id, p.name_ar)}
                              disabled={deleting === p.id}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="حذف">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
                <p className="text-xs text-[var(--text-muted)]">صفحة {page} من {totalPages}</p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-2)] hover:border-brand-300 disabled:opacity-40 transition-colors">
                    ← السابق
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-2)] hover:border-brand-300 disabled:opacity-40 transition-colors">
                    التالي →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
