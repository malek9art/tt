import Link from "next/link";
import { ArrowLeft, Zap, Shield, Truck, Headphones } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/shop/ProductCard";
import ProductCardSkeleton from "@/components/shop/ProductCardSkeleton";
import { getFeaturedProducts, getLatestProducts, getCategories } from "@/lib/api";

export const revalidate = 60; // ISR كل دقيقة

const CATEGORY_ICONS: Record<string, string> = {
  smartphones: "📱", accessories: "🎧", "spare-parts": "🔧",
  chargers: "🔌", tablets: "📟", "repair-services": "⚙️",
};

export default async function HomePage() {
  const [featured, latest, categories] = await Promise.all([
    getFeaturedProducts(8),
    getLatestProducts(8),
    getCategories(),
  ]);

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-bl from-brand-900 via-brand-700 to-brand-600 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #FFE100 0%, transparent 50%), radial-gradient(circle at 80% 20%, #FFE100 0%, transparent 50%)" }} />
        <div className="container-main relative py-20 md:py-28">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent-500/20 px-4 py-1.5 text-sm text-accent-400 border border-accent-500/30">
              <Zap size={14} /> أفضل الأسعار في اليمن
            </div>
            <h1 className="mb-4 text-4xl font-bold leading-tight md:text-5xl">
              جوالك الجديد<br />
              <span className="text-accent-500">بأفضل سعر</span>
            </h1>
            <p className="mb-8 text-lg text-brand-200 leading-relaxed">
              مركز الأحمدي للجوالات ومستلزماتها — تعز، اليمن.
              أحدث الأجهزة، قطع الغيار الأصلية، وخدمات صيانة احترافية.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/products" className="btn-accent">
                تسوّق الآن <ArrowLeft size={16} />
              </Link>
              <Link href="/products?cat=repair-services" className="btn-ghost border border-white/20 text-white hover:bg-white/10">
                خدمات الصيانة
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* مميزاتنا */}
      <section className="border-b border-[var(--border)] bg-[var(--bg-card)]">
        <div className="container-main">
          <div className="grid grid-cols-2 gap-px bg-[var(--border)] md:grid-cols-4">
            {[
              { icon: Shield,     title: "ضمان أصلي",       desc: "على كل المنتجات" },
              { icon: Truck,      title: "توصيل سريع",      desc: "لكل محافظات اليمن" },
              { icon: Headphones, title: "دعم فني",          desc: "على مدار الساعة" },
              { icon: Zap,        title: "أسعار تنافسية",   desc: "أرخص من السوق" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3 bg-[var(--bg-card)] px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <Icon size={20} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--text-1)]">{title}</div>
                  <div className="text-xs text-[var(--text-muted)]">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* الفئات */}
      {categories.length > 0 && (
        <section className="py-12">
          <div className="container-main">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="section-title">تسوّق حسب الفئة</h2>
              <Link href="/products" className="text-sm text-brand-700 hover:text-brand-900 dark:text-accent-400">
                عرض الكل
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {categories.map(cat => (
                <Link key={cat.id} href={`/products?cat=${cat.slug}`}
                  className="card-base flex flex-col items-center gap-2 p-4 text-center transition-all hover:border-brand-300 hover:shadow-hover">
                  <span className="text-3xl">{CATEGORY_ICONS[cat.slug] ?? "📦"}</span>
                  <span className="text-xs font-medium text-[var(--text-1)] leading-tight">{cat.name_ar}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* المنتجات المميزة */}
      <section className="bg-[var(--bg-card)] py-12">
        <div className="container-main">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="section-title">منتجات مميزة</h2>
            <Link href="/products?featured=true" className="text-sm text-brand-700 hover:text-brand-900 dark:text-accent-400">
              عرض الكل
            </Link>
          </div>
          {featured.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {featured.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          )}
        </div>
      </section>

      {/* أحدث المنتجات */}
      <section className="py-12">
        <div className="container-main">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="section-title">أحدث الواردات</h2>
            <Link href="/products?sort=newest" className="text-sm text-brand-700 hover:text-brand-900 dark:text-accent-400">
              عرض الكل
            </Link>
          </div>
          {latest.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {latest.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-12 text-center text-[var(--text-muted)]">
              <p className="text-4xl mb-3">📦</p>
              <p className="font-medium">لا توجد منتجات بعد</p>
              <p className="text-sm mt-1">أضف منتجات من لوحة الإدارة لتظهر هنا</p>
            </div>
          )}
        </div>
      </section>

      {/* بانر CTA */}
      <section className="bg-brand-700 py-14 text-white">
        <div className="container-main text-center">
          <h2 className="mb-3 text-2xl font-bold">هل تحتاج إلى صيانة جهازك؟</h2>
          <p className="mb-6 text-brand-200">فنيون متخصصون لإصلاح كل أنواع الأجهزة</p>
          <Link href="/products?cat=repair-services" className="btn-accent">
            احجز موعد صيانة
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
