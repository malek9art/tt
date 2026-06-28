"use client";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { type Product } from "@/lib/supabase";
import { formatPrice, discountPercent, getPrimaryImage, getLowestPrice, getHighestComparePrice } from "@/lib/api";
import { useCartStore } from "@/store/cartStore";

interface Props { product: Product; }

export default function ProductCard({ product }: Props) {
  const { addItem } = useCartStore();
  const imageUrl  = getPrimaryImage(product);
  const price     = getLowestPrice(product);
  const oldPrice  = getHighestComparePrice(product);
  const discount  = oldPrice ? discountPercent(oldPrice, price) : 0;
  const isNew     = product.condition === "new";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    addItem(product, undefined, 1);
  };

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="card-base overflow-hidden">
        <div className="relative aspect-square overflow-hidden bg-brand-50">
          <Image src={imageUrl} alt={product.name_ar}
            fill sizes="(max-width:640px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105" />
          <div className="absolute top-2 end-2 flex flex-col gap-1">
            {discount > 0 && <span className="badge bg-red-500 text-white">-{discount}%</span>}
            {!isNew && <span className="badge bg-brand-600 text-white text-[10px]">مستعمل</span>}
          </div>
          <button onClick={e => { e.preventDefault(); e.stopPropagation(); }}
            className="absolute top-2 start-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[var(--text-2)] opacity-0 shadow transition-all group-hover:opacity-100 hover:text-red-500">
            <Heart size={14} />
          </button>
        </div>
        <div className="p-3">
          {product.brands && (
            <p className="mb-0.5 text-xs text-[var(--text-muted)]">{(product.brands as {name: string}).name}</p>
          )}
          <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-[var(--text-1)] leading-snug">
            {product.name_ar}
          </h3>
          <div className="mb-2 flex items-center gap-0.5">
            {[1,2,3,4,5].map(s => <Star key={s} size={10} className="fill-accent-500 text-accent-500" />)}
          </div>
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
            <button onClick={handleAddToCart}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-700 text-white hover:bg-brand-800 active:scale-90 transition-all">
              <ShoppingCart size={14} />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
