"use client";
import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getProductBySlug, getLatestProducts, formatPrice, discountPercent } from "@/lib/api";
import { useCartStore } from "@/store/cartStore";
import { Shield, Truck, RotateCcw, Star, ChevronLeft, CheckCircle, ShoppingCart, Loader2 } from "lucide-react";
import type { Product, ProductVariant } from "@/lib/supabase";

const FALLBACK_IMG = "https://placehold.co/600x600/09444C/FFE100?text=%F0%9F%93%B1";

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCartStore();

  const [product,  setProduct]  = useState<Product | null>(null);
  const [related,  setRelated]  = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<ProductVariant | null>(null);
  const [added,    setAdded]    = useState(false);

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      getProductBySlug(slug),
      getLatestProducts(5),
    ]).then(([p, r]) => {
      if (!p) { notFound(); return; }
      setProduct(p);
      setRelated(r.filter(x => x.id !== p.id).slice(0, 4));
      // اختر أول متغيّر نشط تلقائياً
      const first = p.product_variants?.find(v => v.is_active) ?? null;
      setSelected(first);
      setLoading(false);
    });
  }, [slug]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, selected ?? undefined, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) return (
    <div className="min-h-screen">
      <Header />
      <div className="container-main py-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="skeleton aspect-square w-full rounded-xl" />
          <div className="space-y-4">
            <div className="skeleton h-8 w-3/4" />
            <div className="skeleton h-6 w-1/2" />
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-12 w-full" />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );

  if (!product) return null;

  const images   = product.product_images ?? [];
  const primary  = images.find(i => i.is_primary) ?? images[0];
  const variants = product.product_variants?.filter(v => v.is_active) ?? [];
  const price    = selected?.price ?? product.base_price;
  const oldPrice = selected?.compare_at_price ?? null;
  const discount = oldPrice ? discountPercent(oldPrice, price) : 0;
  const inStock  = variants.length > 0 || product.type === "service";

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container-main py-8">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1 text-sm text-[var(--text-muted)]">
          <Link href="/" className="hover:text-brand-700">الرئيسية</Link>
          <ChevronLeft size={14} />
          <Link href="/products" className="hover:text-brand-700">المنتجات</Link>
          {product.categories && (
            <>
              <ChevronLeft size={14} />
              <Link href={`/products?cat=${(product.categories as {slug:string}).slug}`} className="hover:text-brand-700">
                {(product.categories as {name_ar:string}).name_ar}
              </Link>
            </>
          )}
          <ChevronLeft size={14} />
          <span className="text-[var(--text-1)] line-clamp-1">{product.name_ar}</span>
        </nav>

        <div className="grid gap-8 md:grid-cols-2">
          {/* الصور */}
          <div>
            <div className="card-base overflow-hidden aspect-square mb-3">
              <Image
                src={primary?.url ?? FALLBACK_IMG}
                alt={product.name_ar}
                width={600} height={600}
                className="h-full w-full object-cover"
                priority
                onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.slice(0, 6).map(img => (
                  <div key={img.id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--border)]">
                    <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* التفاصيل */}
          <div>
            {product.brands && (
              <p className="mb-1 text-sm text-[var(--text-muted)]">
                {(product.brands as {name:string}).name}
              </p>
            )}
            <h1 className="mb-3 text-2xl font-bold text-[var(--text-1)] leading-snug">
              {product.name_ar}
            </h1>

            {/* التقييم */}
            <div className="mb-4 flex items-center gap-2">
              <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} size={14} className="fill-accent-500 text-accent-500"/>)}</div>
              <span className="text-sm text-[var(--text-muted)]">(لا توجد تقييمات)</span>
            </div>

            {/* السعر */}
            <div className="mb-5 rounded-xl bg-brand-50 dark:bg-brand-900/30 p-4">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-brand-700 dark:text-accent-400">
                  {formatPrice(price, product.currency)}
                </span>
                {oldPrice && (
                  <span className="text-lg text-[var(--text-muted)] line-through">
                    {formatPrice(oldPrice, product.currency)}
                  </span>
                )}
                {discount > 0 && (
                  <span className="badge bg-red-500 text-white text-sm">وفّر {discount}%</span>
                )}
              </div>
            </div>

            {/* المتغيرات */}
            {variants.length > 0 && (
              <div className="mb-5">
                <p className="mb-2 text-sm font-semibold text-[var(--text-1)]">اختر الخيار</p>
                <div className="flex flex-wrap gap-2">
                  {variants.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelected(v)}
                      className={`rounded-lg border px-3 py-2 text-sm transition-all ${
                        selected?.id === v.id
                          ? "border-brand-700 bg-brand-700 text-white shadow"
                          : "border-[var(--border)] text-[var(--text-1)] hover:border-brand-500"
                      }`}>
                      {Object.values(v.attributes as Record<string,string>).join(" / ")}
                      {" — "}
                      {formatPrice(v.price, product.currency)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* المخزون */}
            <div className={`mb-5 flex items-center gap-2 text-sm font-medium ${inStock ? "text-green-600" : "text-red-500"}`}>
              <CheckCircle size={16} />
              {inStock ? "متوفر في المخزون" : "غير متوفر حالياً"}
            </div>

            {/* أزرار الإجراء */}
            <div className="mb-6 flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={!inStock}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-base font-bold transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg ${
                  added
                    ? "bg-green-500 text-white shadow-green-500/30"
                    : "bg-brand-700 text-white hover:bg-brand-800 shadow-brand-700/30"
                }`}>
                {added
                  ? <><CheckCircle size={18}/> أُضيف للسلة!</>
                  : <><ShoppingCart size={18}/> أضف إلى السلة</>}
              </button>
            </div>

            {/* المميزات */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { icon: Shield,    label: product.warranty ?? "ضمان" },
                { icon: Truck,     label: "توصيل سريع" },
                { icon: RotateCcw, label: "إرجاع 7 أيام" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1 rounded-xl border border-[var(--border)] p-3 text-center">
                  <Icon size={18} className="text-brand-700" />
                  <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
                </div>
              ))}
            </div>

            {/* الوصف */}
            {product.description && (
              <div className="border-t border-[var(--border)] pt-5">
                <h3 className="mb-3 font-semibold text-[var(--text-1)]">وصف المنتج</h3>
                <p className="text-sm text-[var(--text-2)] leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {/* المواصفات */}
            {product.attributes && Object.keys(product.attributes as object).length > 0 && (
              <div className="border-t border-[var(--border)] pt-5 mt-5">
                <h3 className="mb-3 font-semibold text-[var(--text-1)]">المواصفات</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(product.attributes as Record<string,unknown>).map(([k, v]) => (
                      <tr key={k} className="border-b border-[var(--border)] last:border-0">
                        <td className="py-2 font-medium text-[var(--text-2)] w-1/3">{k}</td>
                        <td className="py-2 text-[var(--text-1)]">{String(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* منتجات ذات صلة */}
        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="section-title mb-6">منتجات ذات صلة</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {related.map(p => {
                const img = p.product_images?.find(i => i.is_primary)?.url
                  ?? p.product_images?.[0]?.url
                  ?? FALLBACK_IMG;
                return (
                  <Link key={p.id} href={`/products/${p.slug}`}
                    className="card-base overflow-hidden group">
                    <div className="aspect-square overflow-hidden">
                      <Image src={img} alt={p.name_ar} width={300} height={300}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 text-sm font-medium text-[var(--text-1)]">{p.name_ar}</p>
                      <p className="mt-1 text-sm font-bold text-brand-700 dark:text-accent-400">
                        {formatPrice(p.base_price, p.currency)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
      <Footer />
    </div>
  );
}
