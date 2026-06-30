"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { HiHeart, HiShoppingCart, HiCheck } from "react-icons/hi2";
import { HiStar } from "react-icons/hi";
import { type Product } from "@/lib/supabase";
import { formatPrice, discountPercent, getPrimaryImage, getLowestPrice, getHighestComparePrice } from "@/lib/api";
import { useCartStore } from "@/store/cartStore";
import { toast } from "@/store/toastStore";

interface Props { product: Product; }

const FALLBACK_IMG = "https://placehold.co/400x400/09444C/FFE100?text=%F0%9F%93%B1";

export default function ProductCard({ product }: Props) {
  const { addItem } = useCartStore();
  const [added,   setAdded]   = useState(false);
  const [wished,  setWished]  = useState(false);
  const imageUrl = getPrimaryImage(product) || FALLBACK_IMG;
  const price    = getLowestPrice(product);
  const oldPrice = getHighestComparePrice(product);
  const discount = oldPrice ? discountPercent(oldPrice, price) : 0;
  const isNew    = product.condition === "new";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    addItem(product, undefined, 1);
    setAdded(true);
    toast.success(`تمت إضافة ${product.name_ar} إلى السلة`);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setWished(w => !w);
    toast.info(wished ? "تمت إزالة المنتج من المفضلة" : "تمت إضافة المنتج إلى المفضلة");
  };

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="card-base overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-hover">
        {/* الصورة */}
        <div className="relative aspect-square overflow-hidden bg-brand-50 dark:bg-brand-900/20">
          <Image
            src={imageUrl}
            alt={product.name_ar}
            fill
            sizes="(max-width:640px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
          />

          {/* الشارات */}
          <div className="absolute top-2 end-2 flex flex-col gap-1">
            {discount > 0 && (
              <span className="badge bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg shadow">
                -{discount}%
              </span>
            )}
            {!isNew && (
              <span className="badge bg-brand-600 text-white text-[10px] px-2 py-0.5 rounded-lg shadow">
                مستعمل
              </span>
            )}
          </div>

          {/* زر المفضلة */}
          <button onClick={handleWishlist}
            className={`absolute top-2 start-2 flex h-8 w-8 items-center justify-center rounded-full shadow transition-all duration-200
              ${wished
                ? "bg-red-500 text-white opacity-100"
                : "bg-white/80 dark:bg-brand-800/80 text-[var(--text-2)] opacity-0 group-hover:opacity-100 hover:text-red-500"
              }`}>
            <HiHeart className={`text-base ${wished ? "fill-white" : ""}`}/>
          </button>

          {/* زر إضافة للسلة — يظهر عند Hover */}
          <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <button onClick={handleAddToCart}
              className={`w-full py-2.5 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2
                ${added
                  ? "bg-green-500 text-white"
                  : "bg-brand-700/95 hover:bg-brand-800 text-white"
                }`}>
              {added
                ? <><HiCheck className="text-base"/> تمت الإضافة</>
                : <><HiShoppingCart className="text-base"/> أضف للسلة</>
              }
            </button>
          </div>
        </div>

        {/* المعلومات */}
        <div className="p-3">
          {product.brands && (
            <p className="mb-0.5 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">
              {(product.brands as {name: string}).name}
            </p>
          )}
          <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-[var(--text-1)] leading-snug">
            {product.name_ar}
          </h3>

          {/* التقييم */}
          <div className="mb-2.5 flex items-center gap-1">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(s => (
                <HiStar key={s} className="text-accent-500 text-xs"/>
              ))}
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">(5.0)</span>
          </div>

          {/* السعر + زر السلة للجوال */}
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-base font-bold text-brand-700 dark:text-accent-400">
                {formatPrice(price, product.currency)}
              </div>
              {oldPrice && (
                <div className="text-xs text-[var(--text-muted)] line-through">
                  {formatPrice(oldPrice, product.currency)}
                </div>
              )}
            </div>
            {/* زر السلة الثابت للجوال */}
            <button onClick={handleAddToCart}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200 md:hidden
                ${added ? "bg-green-500 text-white" : "bg-brand-700 hover:bg-brand-800 active:scale-90 text-white"}`}>
              {added ? <HiCheck className="text-sm"/> : <HiShoppingCart className="text-sm"/>}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
