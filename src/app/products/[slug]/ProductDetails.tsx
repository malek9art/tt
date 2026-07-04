"use client";
import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiShieldCheck, HiTruck, HiArrowPath, HiChevronLeft,
  HiCheck, HiXMark, HiStar as HiStarSolid, HiHeart,
  HiShare, HiDevicePhoneMobile, HiChevronDown, HiChevronUp,
} from "react-icons/hi2";
import { FaWhatsapp } from "react-icons/fa6";
import type { Product, ProductVariant } from "@/lib/supabase";
import { formatPrice, discountPercent, getStockStatus, getVariantStock } from "@/lib/api";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { toast } from "@/store/toastStore";
import ProductCard from "@/components/shop/ProductCard";

interface Props { product: Product; related: Product[]; }

const FALLBACK = "https://placehold.co/600x600/09444C/FFE100?text=%F0%9F%93%B1";

export default function ProductDetails({ product, related }: Props) {
  const { addItem } = useCartStore();
  const images   = product.product_images ?? [];
  const variants = product.product_variants?.filter(v => v.is_active) ?? [];

  const [activeImg, setActiveImg] = useState(0);
  const [lightbox,  setLightbox]  = useState(false);
  const [selected,  setSelected]  = useState<ProductVariant | null>(
    variants.find(v => v.is_active) ?? null
  );
  const [qty,      setQty]      = useState(1);
  const [added,    setAdded]    = useState(false);
  const { user } = useAuthStore();
  const wished = useWishlistStore(s => Boolean(s.ids[product.id]));
  const toggleWishlist = useWishlistStore(s => s.toggle);
  const [descOpen, setDescOpen] = useState(true);
  const [specOpen, setSpecOpen] = useState(true);

  const price    = selected?.price ?? product.base_price;
  const oldPrice = selected?.compare_at_price ?? null;
  const discount = oldPrice ? discountPercent(oldPrice, price) : 0;

  // التوفر الحقيقي من المخزون: الخدمات دائماً متاحة، والمتغيّر المختار يحكم
  const stockStatus   = getStockStatus(product);
  const selectedStock = selected ? getVariantStock(selected) : null;
  const inStock = product.type === "service"
    ? true
    : selected
    ? (selectedStock === null || selectedStock > 0)
    : stockStatus !== "out";
  const lowStock = inStock && (
    (selected && selectedStock !== null && selectedStock <= 5) ||
    (!selected && stockStatus === "low")
  );

  const imgUrl   = images[activeImg]?.url ?? FALLBACK;

  // تجميع سمات المتغيرات حسب المفتاح
  const attrKeys = variants.length > 0
    ? Object.keys(variants[0].attributes as Record<string, string>)
    : [];

  const router = useRouter();

  const handleBuyNow = () => {
    if (!inStock) return;
    handleAddToCart();
    router.push("/checkout");
  };

  const handleAddToCart = () => {
    if (!inStock) return;
    addItem(product, selected ?? undefined, qty);
    setAdded(true);
    toast.success(`تمت إضافة ${product.name_ar} إلى السلة`);
    setTimeout(() => setAdded(false), 2500);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: product.name_ar, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.info("تم نسخ رابط المنتج");
    }
  };

  // لا تلمس window أثناء SSR — نبني الرابط من الـ slug مباشرة
  const productUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/products/${product.slug}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(`${product.name_ar}\n${productUrl}`)}`;

  return (
    <div dir="rtl">
      <div className="container-main py-6">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1 text-sm text-[var(--text-muted)]">
          <Link href="/" className="hover:text-brand-700 transition-colors">الرئيسية</Link>
          <HiChevronLeft className="text-xs"/>
          <Link href="/products" className="hover:text-brand-700 transition-colors">المنتجات</Link>
          {product.categories && (
            <>
              <HiChevronLeft className="text-xs"/>
              <Link href={`/products?cat=${(product.categories as {slug:string}).slug}`}
                className="hover:text-brand-700 transition-colors">
                {(product.categories as {name_ar:string}).name_ar}
              </Link>
            </>
          )}
          <HiChevronLeft className="text-xs"/>
          <span className="text-[var(--text-1)] line-clamp-1">{product.name_ar}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2">

          {/* ===== معرض الصور ===== */}
          <div className="lg:sticky lg:top-20 self-start">
            {/* الصورة الرئيسية */}
            <div
              className="relative mb-3 aspect-square overflow-hidden rounded-2xl border border-[var(--border)] bg-brand-50 dark:bg-brand-900/20 cursor-zoom-in"
              onClick={() => setLightbox(true)}>
              <Image
                src={imgUrl} alt={product.name_ar}
                fill sizes="(max-width:768px) 100vw, 50vw"
                className="object-cover transition-transform duration-500 hover:scale-105"
                priority
                onError={e => { (e.target as HTMLImageElement).src = FALLBACK; }}
              />
              {discount > 0 && (
                <span className="absolute top-3 end-3 rounded-xl bg-red-500 px-3 py-1 text-sm font-bold text-white shadow">
                  وفّر {discount}%
                </span>
              )}
              {!product.condition || product.condition !== "new" ? (
                <span className="absolute top-3 start-3 rounded-xl bg-brand-700 px-2 py-1 text-xs font-medium text-white shadow">
                  مستعمل
                </span>
              ) : null}
              <div className="absolute bottom-3 start-3 rounded-lg bg-black/40 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
                انقر للتكبير
              </div>
            </div>

            {/* الصور المصغرة */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button key={img.id} onClick={() => setActiveImg(idx)}
                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                      activeImg === idx
                        ? "border-brand-700 shadow-md shadow-brand-700/20"
                        : "border-[var(--border)] hover:border-brand-400"
                    }`}>
                    <Image src={img.url} alt="" fill sizes="64px" className="object-cover"/>
                  </button>
                ))}
              </div>
            )}

            {/* أزرار المشاركة */}
            <div className="mt-3 flex gap-2">
              <a href={waUrl} target="_blank" rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400 transition-colors">
                <FaWhatsapp className="text-lg"/> شارك عبر واتساب
              </a>
              <button onClick={handleShare}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--border)] transition-colors">
                <HiShare className="text-lg"/>
              </button>
            </div>
          </div>

          {/* ===== تفاصيل المنتج ===== */}
          <div>
            {product.brands && (
              <p className="mb-1 text-sm font-medium text-[var(--text-muted)] uppercase tracking-wide">
                {(product.brands as {name:string}).name}
              </p>
            )}
            <h1 className="mb-3 text-2xl font-bold text-[var(--text-1)] leading-snug md:text-3xl">
              {product.name_ar}
            </h1>

            {/* التقييم */}
            <div className="mb-5 flex items-center gap-3">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <HiStarSolid key={s} className="text-accent-500 text-base"/>
                ))}
              </div>
              <span className="text-sm text-[var(--text-muted)]">لا توجد تقييمات بعد</span>
            </div>

            {/* السعر */}
            <div className="mb-6 rounded-2xl bg-brand-50 dark:bg-brand-900/30 p-4 border border-brand-100 dark:border-brand-800">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl font-bold text-brand-700 dark:text-accent-400">
                  {formatPrice(price, product.currency)}
                </span>
                {oldPrice && (
                  <span className="text-lg text-[var(--text-muted)] line-through">
                    {formatPrice(oldPrice, product.currency)}
                  </span>
                )}
                {discount > 0 && (
                  <span className="rounded-lg bg-red-500 px-2.5 py-1 text-sm font-bold text-white">
                    -{discount}%
                  </span>
                )}
              </div>
              {oldPrice && discount > 0 && (
                <p className="mt-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
                  توفّر {formatPrice(oldPrice - price, product.currency)} مقارنةً بالسعر الأصلي
                </p>
              )}
            </div>

            {/* المتغيرات */}
            {variants.length > 0 && attrKeys.map(key => {
              const options = [...new Set(variants.map(v => (v.attributes as Record<string,string>)[key]))];
              return (
                <div key={key} className="mb-4">
                  <p className="mb-2 text-sm font-semibold text-[var(--text-1)]">
                    {key}:
                    <span className="font-normal text-[var(--text-muted)] mr-2">
                      {(selected?.attributes as Record<string,string>)?.[key]}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {options.map(opt => {
                      const v = variants.find(v => (v.attributes as Record<string,string>)[key] === opt);
                      const isSelected = (selected?.attributes as Record<string,string>)?.[key] === opt;
                      return (
                        <button key={opt} onClick={() => v && setSelected(v)}
                          className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                            isSelected
                              ? "border-brand-700 bg-brand-700 text-white shadow-md shadow-brand-700/20"
                              : "border-[var(--border)] text-[var(--text-1)] hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/30"
                          }`}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* الكمية + إضافة للسلة */}
            <div className="mb-5 flex gap-3">
              {/* الكمية */}
              <div className="flex items-center rounded-xl border border-[var(--border)] overflow-hidden">
                <button onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="flex h-12 w-10 items-center justify-center text-[var(--text-2)] hover:bg-[var(--border)] transition-colors text-xl font-light">
                  −
                </button>
                <span className="flex h-12 w-10 items-center justify-center font-semibold text-[var(--text-1)]">
                  {qty}
                </span>
                <button onClick={() => setQty(q => q + 1)}
                  className="flex h-12 w-10 items-center justify-center text-[var(--text-2)] hover:bg-[var(--border)] transition-colors text-xl font-light">
                  +
                </button>
              </div>

              {/* زر الإضافة */}
              <button onClick={handleAddToCart} disabled={!inStock}
                className={`flex flex-1 items-center justify-center gap-2.5 rounded-xl py-3 text-base font-bold transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg ${
                  added
                    ? "bg-green-500 text-white shadow-green-500/20"
                    : "bg-brand-700 text-white hover:bg-brand-800 shadow-brand-700/20"
                }`}>
                {added
                  ? <><HiCheck className="text-xl"/> أُضيف للسلة!</>
                  : <><HiDevicePhoneMobile className="text-xl"/> أضف إلى السلة</>}
              </button>

              {/* المفضلة */}
              <button onClick={() => toggleWishlist(product.id, user?.id)}
                className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-all ${
                  wished
                    ? "border-red-500 bg-red-500 text-white"
                    : "border-[var(--border)] text-[var(--text-2)] hover:border-red-400 hover:text-red-500"
                }`}>
                <HiHeart className="text-xl"/>
              </button>
            </div>

            {/* اشترِ الآن */}
            {inStock && (
              <button onClick={handleBuyNow}
                className="mb-4 w-full rounded-xl border-2 border-brand-700 py-3 text-base font-bold text-brand-700 dark:text-accent-400 dark:border-accent-500 hover:bg-brand-700 hover:text-white transition-all active:scale-[0.98]">
                ⚡ اشترِ الآن — توصيل سريع
              </button>
            )}

            {/* شريط الثقة */}
            <div className="mb-5 grid grid-cols-3 gap-2 text-center">
              {[
                { icon: "🚚", label: "توصيل لكل المحافظات" },
                { icon: "💵", label: "الدفع عند الاستلام" },
                { icon: "✅", label: "منتجات أصلية 100%" },
              ].map(b => (
                <div key={b.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-2 py-3">
                  <p className="text-xl mb-1">{b.icon}</p>
                  <p className="text-[11px] font-medium text-[var(--text-2)] leading-tight">{b.label}</p>
                </div>
              ))}
            </div>

            {/* حالة التوفر */}
            <div className={`mb-5 flex items-center gap-2 text-sm font-medium ${
              !inStock ? "text-red-500" : lowStock ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"
            }`}>
              {!inStock
                ? <><HiXMark className="text-base"/> نفد المخزون — سيتوفر قريباً</>
                : lowStock
                ? <><HiCheck className="text-base"/> كمية محدودة — اطلب قبل النفاد{selectedStock !== null && selectedStock > 0 ? ` (متبقٍ ${selectedStock})` : ""}</>
                : <><HiCheck className="text-base"/> متوفر في المخزون — يصلك خلال 1-3 أيام</>}
            </div>

            {/* ضمانات */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              {[
                { icon: HiShieldCheck,  label: product.warranty ?? "ضمان أصلي",  color: "text-green-600 bg-green-50 dark:bg-green-900/20" },
                { icon: HiTruck,        label: "توصيل سريع",                      color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
                { icon: HiArrowPath,    label: "إرجاع 7 أيام",                    color: "text-orange-500 bg-orange-50 dark:bg-orange-900/20" },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className={`flex flex-col items-center gap-2 rounded-xl p-3 text-center ${color}`}>
                  <Icon className="text-2xl"/>
                  <span className="text-[11px] font-medium leading-tight">{label}</span>
                </div>
              ))}
            </div>

            {/* الوصف — قابل للطي */}
            {product.description && (
              <div className="border-t border-[var(--border)] pt-4 mb-4">
                <button onClick={() => setDescOpen(o => !o)}
                  className="flex w-full items-center justify-between py-1 text-sm font-semibold text-[var(--text-1)]">
                  وصف المنتج
                  {descOpen ? <HiChevronUp className="text-base"/> : <HiChevronDown className="text-base"/>}
                </button>
                <AnimatePresence>
                  {descOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                      className="overflow-hidden">
                      <p className="pt-3 text-sm text-[var(--text-2)] leading-relaxed whitespace-pre-line">
                        {product.description}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* المواصفات — قابلة للطي */}
            {product.attributes && Object.keys(product.attributes as object).length > 0 && (
              <div className="border-t border-[var(--border)] pt-4">
                <button onClick={() => setSpecOpen(o => !o)}
                  className="flex w-full items-center justify-between py-1 text-sm font-semibold text-[var(--text-1)]">
                  المواصفات التقنية
                  {specOpen ? <HiChevronUp className="text-base"/> : <HiChevronDown className="text-base"/>}
                </button>
                <AnimatePresence>
                  {specOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                      className="overflow-hidden">
                      <table className="mt-3 w-full text-sm">
                        <tbody>
                          {Object.entries(product.attributes as Record<string,unknown>).map(([k, v]) => (
                            <tr key={k} className="border-b border-[var(--border)] last:border-0">
                              <td className="py-2.5 font-medium text-[var(--text-muted)] w-2/5 pe-4">{k}</td>
                              <td className="py-2.5 text-[var(--text-1)]">{String(v)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* منتجات ذات صلة */}
        {related.length > 0 && (
          <section className="mt-16">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="section-title">منتجات ذات صلة</h2>
              <Link href="/products" className="text-sm text-brand-700 hover:underline dark:text-accent-400">
                عرض الكل
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {related.map(p => <ProductCard key={p.id} product={p}/>)}
            </div>
          </section>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setLightbox(false)}>
            <button className="absolute top-4 end-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
              <HiXMark className="text-2xl"/>
            </button>
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="relative max-h-[90vh] max-w-[90vw] aspect-square"
              onClick={e => e.stopPropagation()}>
              <Image src={imgUrl} alt={product.name_ar} fill sizes="90vw"
                className="object-contain rounded-xl"/>
            </motion.div>
            {images.length > 1 && (
              <div className="absolute bottom-4 flex gap-2">
                {images.map((img, idx) => (
                  <button key={idx} onClick={e => { e.stopPropagation(); setActiveImg(idx); }}
                    className={`h-2 w-2 rounded-full transition-all ${
                      idx === activeImg ? "bg-white w-6" : "bg-white/40"
                    }`}/>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* زر السلة اللاصق للجوال */}
      {!added && inStock && (
        <div className="fixed bottom-0 inset-x-0 z-30 p-3 bg-[var(--bg-card)]/95 backdrop-blur border-t border-[var(--border)] md:hidden">
          <button onClick={handleAddToCart}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-700 py-3.5 text-base font-bold text-white hover:bg-brand-800 active:scale-[0.98] transition-all shadow-lg shadow-brand-700/20">
            <HiDevicePhoneMobile className="text-xl"/> أضف إلى السلة — {formatPrice(price * qty, product.currency)}
          </button>
        </div>
      )}
    </div>
  );
}
