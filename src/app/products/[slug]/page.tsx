import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getProductBySlug, getLatestProducts, formatPrice, discountPercent } from "@/lib/api";
import { Shield, Truck, RotateCcw, Star, ChevronLeft, CheckCircle } from "lucide-react";
import type { Metadata } from "next";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "منتج غير موجود" };
  return {
    title: product.name_ar,
    description: product.description ?? `اشترِ ${product.name_ar} بأفضل سعر في اليمن`,
  };
}

export const revalidate = 60;

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [product, related] = await Promise.all([
    getProductBySlug(slug),
    getLatestProducts(4),
  ]);

  if (!product) notFound();

  const images    = product.product_images ?? [];
  const primary   = images.find(i => i.is_primary) ?? images[0];
  const variants  = product.product_variants?.filter(v => v.is_active) ?? [];
  const minPrice  = variants.length ? Math.min(...variants.map(v => v.price)) : product.base_price;
  const maxOld    = variants.length ? Math.max(...variants.filter(v=>v.compare_at_price).map(v=>v.compare_at_price!)) : null;
  const discount  = maxOld ? discountPercent(maxOld, minPrice) : 0;
  const inStock   = variants.length > 0;

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
            <><ChevronLeft size={14} />
            <Link href={`/products?cat=${product.categories.slug}`} className="hover:text-brand-700">
              {product.categories.name_ar}
            </Link></>
          )}
          <ChevronLeft size={14} />
          <span className="text-[var(--text-1)] line-clamp-1">{product.name_ar}</span>
        </nav>

        <div className="grid gap-8 md:grid-cols-2">
          {/* الصور */}
          <div>
            <div className="card-base overflow-hidden aspect-square mb-3">
              {primary ? (
                <Image src={primary.url} alt={product.name_ar}
                  width={600} height={600} className="h-full w-full object-cover" priority />
              ) : (
                <div className="flex h-full items-center justify-center bg-brand-50 text-6xl">📱</div>
              )}
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
              <p className="mb-1 text-sm text-[var(--text-muted)]">{product.brands.name}</p>
            )}
            <h1 className="mb-3 text-2xl font-bold text-[var(--text-1)] leading-snug">{product.name_ar}</h1>

            {/* التقييم */}
            <div className="mb-4 flex items-center gap-2">
              <div className="flex">{[1,2,3,4,5].map(s=><Star key={s} size={14} className="fill-accent-500 text-accent-500"/>)}</div>
              <span className="text-sm text-[var(--text-muted)]">(لا توجد تقييمات بعد)</span>
            </div>

            {/* السعر */}
            <div className="mb-6 rounded-xl bg-brand-50 dark:bg-brand-900 p-4">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-brand-700 dark:text-accent-400">
                  {formatPrice(minPrice, product.currency)}
                </span>
                {maxOld && (
                  <span className="text-lg text-[var(--text-muted)] line-through">
                    {formatPrice(maxOld, product.currency)}
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
                <p className="mb-2 text-sm font-semibold text-[var(--text-1)]">الخيارات المتاحة</p>
                <div className="flex flex-wrap gap-2">
                  {variants.map(v => (
                    <button key={v.id}
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-1)] hover:border-brand-500 transition-colors">
                      {Object.values(v.attributes).join(" / ")} — {formatPrice(v.price, product.currency)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* حالة المخزون */}
            <div className={`mb-5 flex items-center gap-2 text-sm font-medium ${inStock ? "text-green-600" : "text-red-500"}`}>
              <CheckCircle size={16} />
              {inStock ? "متوفر في المخزون" : "غير متوفر حالياً"}
            </div>

            {/* أزرار الإجراء */}
            <div className="mb-6 flex gap-3">
              <button className="btn-primary flex-1" disabled={!inStock}>
                أضف إلى السلة
              </button>
              <button className="btn-ghost border border-[var(--border)] px-4">
                ♡
              </button>
            </div>

            {/* المميزات */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Shield,      label: product.warranty ?? "ضمان" },
                { icon: Truck,       label: "توصيل سريع" },
                { icon: RotateCcw,   label: "إرجاع مجاني" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1 rounded-xl border border-[var(--border)] p-3 text-center">
                  <Icon size={18} className="text-brand-700" />
                  <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
                </div>
              ))}
            </div>

            {/* الوصف */}
            {product.description && (
              <div className="mt-6 border-t border-[var(--border)] pt-5">
                <h3 className="mb-3 font-semibold text-[var(--text-1)]">وصف المنتج</h3>
                <p className="text-sm text-[var(--text-2)] leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {/* المواصفات */}
            {product.attributes && Object.keys(product.attributes).length > 0 && (
              <div className="mt-5 border-t border-[var(--border)] pt-5">
                <h3 className="mb-3 font-semibold text-[var(--text-1)]">المواصفات</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(product.attributes).map(([k, v]) => (
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
              {related.filter(r => r.id !== product.id).slice(0, 4).map(p => {
                const img = p.product_images?.[0]?.url ?? "https://placehold.co/300x300/09444C/FFE100?text=📱";
                return (
                  <Link key={p.id} href={`/products/${p.slug}`} className="card-base overflow-hidden group">
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
