import { Suspense } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/shop/ProductCard";
import ProductCardSkeleton from "@/components/shop/ProductCardSkeleton";
import { getProducts, getCategories } from "@/lib/api";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";

export const metadata = { title: "المنتجات" };
export const revalidate = 30;

const SORT_OPTIONS = [
  { value: "newest",     label: "الأحدث" },
  { value: "price_asc",  label: "السعر: الأقل أولاً" },
  { value: "price_desc", label: "السعر: الأعلى أولاً" },
];

interface PageProps {
  searchParams: Promise<{ cat?: string; sort?: string; page?: string; q?: string }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params  = await searchParams;
  const cat     = params.cat;
  const sort    = (params.sort as "newest" | "price_asc" | "price_desc") ?? "newest";
  const page    = Number(params.page ?? 1);
  const search  = params.q;

  const [{ products, total }, categories] = await Promise.all([
    getProducts({ category: cat, sort, page, search }),
    getCategories(),
  ]);

  const totalPages = Math.ceil(total / 12);

  return (
    <div className="min-h-screen">
      <Header />

      <div className="container-main py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-[var(--text-muted)]">
          <Link href="/" className="hover:text-brand-700">الرئيسية</Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--text-1)]">المنتجات</span>
          {cat && <><span className="mx-2">/</span><span className="text-[var(--text-1)]">{categories.find(c=>c.slug===cat)?.name_ar ?? cat}</span></>}
        </nav>

        <div className="flex flex-col gap-6 md:flex-row">
          {/* فلاتر الجانب - سطح المكتب */}
          <aside className="hidden md:block w-56 shrink-0">
            <div className="card-base p-4 sticky top-24">
              <h3 className="mb-3 font-semibold text-[var(--text-1)] flex items-center gap-2">
                <SlidersHorizontal size={16} /> الفئات
              </h3>
              <ul className="space-y-1">
                <li>
                  <Link href="/products"
                    className={`block rounded-lg px-3 py-2 text-sm transition-colors ${!cat ? "bg-brand-700 text-white font-medium" : "text-[var(--text-2)] hover:bg-[var(--border)]"}`}>
                    جميع المنتجات
                  </Link>
                </li>
                {categories.map(c => (
                  <li key={c.id}>
                    <Link href={`/products?cat=${c.slug}`}
                      className={`block rounded-lg px-3 py-2 text-sm transition-colors ${cat===c.slug ? "bg-brand-700 text-white font-medium" : "text-[var(--text-2)] hover:bg-[var(--border)]"}`}>
                      {c.name_ar}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* المنتجات */}
          <main className="flex-1 min-w-0">
            {/* شريط الفرز */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-[var(--text-muted)]">
                {total > 0 ? `${total} منتج` : "لا توجد منتجات"}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--text-muted)]">ترتيب:</span>
                <div className="flex gap-1">
                  {SORT_OPTIONS.map(o => (
                    <Link key={o.value}
                      href={`/products?${new URLSearchParams({...(cat?{cat}:{}), sort:o.value}).toString()}`}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${sort===o.value ? "bg-brand-700 text-white" : "border border-[var(--border)] text-[var(--text-2)] hover:border-brand-300"}`}>
                      {o.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* فلاتر الجوال */}
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 md:hidden">
              <Link href="/products"
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${!cat ? "bg-brand-700 text-white border-brand-700" : "border-[var(--border)] text-[var(--text-2)]"}`}>
                الكل
              </Link>
              {categories.map(c => (
                <Link key={c.id} href={`/products?cat=${c.slug}`}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${cat===c.slug ? "bg-brand-700 text-white border-brand-700" : "border-[var(--border)] text-[var(--text-2)]"}`}>
                  {c.name_ar}
                </Link>
              ))}
            </div>

            {/* شبكة المنتجات */}
            {products.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-16 text-center">
                <p className="text-4xl mb-3">📦</p>
                <p className="font-semibold text-[var(--text-1)]">لا توجد منتجات</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">جرّب فئة أخرى أو أضف منتجات من لوحة الإدارة</p>
                <Link href="/products" className="btn-primary mt-4 inline-flex">عرض الكل</Link>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <Link key={p}
                    href={`/products?${new URLSearchParams({...(cat?{cat}:{}), sort, page:String(p)}).toString()}`}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${page===p ? "bg-brand-700 text-white" : "border border-[var(--border)] text-[var(--text-2)] hover:border-brand-300"}`}>
                    {p}
                  </Link>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
