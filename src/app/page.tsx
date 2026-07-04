import Link from "next/link";
import {
  HiArrowLeft, HiBolt, HiShieldCheck, HiTruck, HiChatBubbleLeftRight,
  HiDevicePhoneMobile,
} from "react-icons/hi2";
import {
  MdHeadphones, MdBuildCircle, MdCable, MdTabletAndroid,
  MdMemory, MdElectricalServices,
} from "react-icons/md";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/shop/ProductCard";
import HeroBannerSlider from "@/components/shop/HeroBannerSlider";
import { getFeaturedProducts, getLatestProducts, getCategories, getBanners } from "@/lib/api";

export const revalidate = 60;

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  smartphones:      HiDevicePhoneMobile,
  accessories:      MdHeadphones,
  "spare-parts":    MdMemory,
  chargers:         MdElectricalServices,
  cables:           MdCable,
  tablets:          MdTabletAndroid,
  "repair-services":MdBuildCircle,
};

const CATEGORY_COLORS: Record<string, string> = {
  smartphones:      "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  accessories:      "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  "spare-parts":    "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
  chargers:         "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
  cables:           "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
  tablets:          "bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400",
  "repair-services":"bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
};

export default async function HomePage() {
  const [featured, latest, categories, banners] = await Promise.all([
    getFeaturedProducts(8),
    getLatestProducts(8),
    getCategories(),
    getBanners(),
  ]);

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero — بنرات ديناميكية أو افتراضي */}
      {banners.length > 0 ? (
        <HeroBannerSlider banners={banners}/>
      ) : (
        <section className="relative overflow-hidden bg-gradient-to-bl from-brand-900 via-brand-700 to-brand-600 text-white">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #FFE100 0%, transparent 50%), radial-gradient(circle at 80% 20%, #FFE100 0%, transparent 50%)" }} />
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }}/>
          <div className="container-main relative py-20 md:py-28">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent-500/20 px-4 py-1.5 text-sm text-accent-400 border border-accent-500/30">
                <HiBolt className="text-base"/> أفضل الأسعار في اليمن
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
                <Link href="/products" className="btn-accent inline-flex items-center gap-2">
                  تسوّق الآن <HiArrowLeft className="text-base"/>
                </Link>
                <Link href="/products?cat=repair-services"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10">
                  <MdBuildCircle className="text-base"/> خدمات الصيانة
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* مميزاتنا */}
      <section className="border-b border-[var(--border)] bg-[var(--bg-card)]">
        <div className="container-main">
          <div className="grid grid-cols-2 gap-px bg-[var(--border)] md:grid-cols-4">
            {[
              { icon: HiShieldCheck,         title: "ضمان أصلي",     desc: "على كل المنتجات",     color: "text-green-600 bg-green-50 dark:bg-green-900/20" },
              { icon: HiTruck,               title: "توصيل سريع",    desc: "لكل محافظات اليمن",   color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
              { icon: HiChatBubbleLeftRight,  title: "دعم فني",       desc: "على مدار الساعة",    color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20" },
              { icon: HiBolt,                title: "أسعار تنافسية", desc: "أرخص من السوق",       color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="flex items-center gap-3 bg-[var(--bg-card)] px-5 py-5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="text-xl"/>
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--text-1)]">{title}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</div>
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
              <Link href="/products" className="text-sm text-brand-700 hover:text-brand-900 dark:text-accent-400 font-medium">
                عرض الكل
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7">
              {categories.map((cat: { id: string; slug: string; name_ar: string }) => {
                const Icon  = CATEGORY_ICONS[cat.slug] ?? HiDevicePhoneMobile;
                const color = CATEGORY_COLORS[cat.slug] ?? "bg-brand-50 text-brand-700 dark:bg-brand-900/20";
                return (
                  <Link key={cat.id} href={`/products?cat=${cat.slug}`}
                    className="card-base flex flex-col items-center gap-3 p-4 text-center transition-all hover:border-brand-300 hover:shadow-hover group">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${color}`}>
                      <Icon className="text-2xl"/>
                    </div>
                    <span className="text-xs font-medium text-[var(--text-1)] leading-tight">{cat.name_ar}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* المنتجات المميزة — تُخفى بالكامل إن لم توجد منتجات مميزة */}
      {featured.length > 0 && (
        <section className="bg-[var(--bg-card)] py-12">
          <div className="container-main">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="section-title">منتجات مميزة ⭐</h2>
              <Link href="/products" className="text-sm text-brand-700 hover:text-brand-900 dark:text-accent-400 font-medium">
                عرض الكل
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {featured.map((p: any) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* أحدث المنتجات */}
      <section className="py-12">
        <div className="container-main">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="section-title">أحدث الواردات 🆕</h2>
            <Link href="/products?sort=newest" className="text-sm text-brand-700 hover:text-brand-900 dark:text-accent-400 font-medium">
              عرض الكل
            </Link>
          </div>
          {latest.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {latest.map((p: any) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-12 text-center text-[var(--text-muted)]">
              <HiDevicePhoneMobile className="text-5xl mx-auto mb-3 opacity-30"/>
              <p className="font-medium">لا توجد منتجات بعد</p>
              <p className="text-sm mt-1">أضف منتجات من لوحة الإدارة لتظهر هنا</p>
            </div>
          )}
        </div>
      </section>

      {/* بانر CTA صيانة */}
      <section className="bg-gradient-to-l from-brand-700 to-brand-900 py-14 text-white">
        <div className="container-main">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-500/20 border border-accent-500/30">
                <MdBuildCircle className="text-4xl text-accent-400"/>
              </div>
              <div>
                <h2 className="text-2xl font-bold">هل تحتاج إلى صيانة جهازك؟</h2>
                <p className="text-brand-200 mt-1">فنيون متخصصون لإصلاح كل أنواع الأجهزة — تعز</p>
              </div>
            </div>
            <Link href="/products?cat=repair-services"
              className="btn-accent shrink-0 inline-flex items-center gap-2">
              تواصل لطلب صيانة <HiArrowLeft className="text-base"/>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
