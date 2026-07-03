"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const FALLBACK = "https://placehold.co/300x300/09444C/FFE100?text=%F0%9F%93%B1";

interface WProduct {
  id: string; name_ar: string; slug: string;
  base_price: number; currency: string;
  product_images: { url: string; is_primary: boolean }[];
}
interface WishItem { id: string; products: WProduct | null; }

export default function WishlistPage() {
  const { user }    = useAuthStore();
  const { addItem } = useCartStore();
  const [items,   setItems]   = useState<WishItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await sb
      .from("wishlists")
      .select("id, products(id, name_ar, slug, base_price, currency, product_images(url, is_primary))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // العلاقة many-to-one تعود ككائن مفرد (وليس مصفوفة)
    const mapped: WishItem[] = (data ?? []).map((row: unknown) => {
      const r = row as { id: string; products: unknown };
      const p = (Array.isArray(r.products) ? r.products[0] : r.products) as WProduct | undefined;
      return { id: r.id, products: p ?? null };
    });
    setItems(mapped);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [user]);

  const remove = async (id: string, productId?: string) => {
    await sb.from("wishlists").delete().eq("id", id);
    setItems(prev => prev.filter(x => x.id !== id));
    // مزامنة أيقونات القلب في بطاقات المنتجات
    if (productId) {
      useWishlistStore.setState(s => {
        const next = { ...s.ids };
        delete next[productId];
        return { ids: next };
      });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--text-1)]">قائمة الأمنيات</h1>
        <span className="text-sm text-[var(--text-muted)]">{items.length} منتج</span>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1,2,3].map(i=><div key={i} className="skeleton h-56 rounded-xl"/>)}
        </div>
      ) : items.length === 0 ? (
        <div className="card-base py-20 text-center">
          <Heart size={48} className="mx-auto mb-4 opacity-20 text-[var(--text-muted)]"/>
          <p className="font-semibold text-[var(--text-1)]">قائمة الأمنيات فارغة</p>
          <p className="text-sm text-[var(--text-muted)] mt-1 mb-6">احفظ منتجاتك المفضلة هنا</p>
          <Link href="/products" className="btn-primary">تصفح المنتجات</Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map(item => {
            const p = item.products;
            if (!p) return null;
            const img = p.product_images?.find(i => i.is_primary)?.url
              ?? p.product_images?.[0]?.url ?? FALLBACK;
            return (
              <div key={item.id} className="card-base overflow-hidden group">
                <Link href={`/products/${p.slug}`} className="block relative aspect-square overflow-hidden">
                  <Image src={img} alt={p.name_ar} fill sizes="300px"
                    className="object-cover transition-transform group-hover:scale-105"/>
                </Link>
                <div className="p-3">
                  <Link href={`/products/${p.slug}`}>
                    <p className="font-semibold text-sm text-[var(--text-1)] line-clamp-2 hover:text-brand-700 transition-colors">
                      {p.name_ar}
                    </p>
                  </Link>
                  <p className="text-base font-bold text-brand-700 dark:text-accent-400 mt-1">
                    {new Intl.NumberFormat("ar-YE").format(p.base_price)} ﷼
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => addItem(p as Parameters<typeof addItem>[0], undefined, 1)}
                      className="btn-primary flex-1 justify-center text-sm py-2 gap-1.5">
                      <ShoppingCart size={14}/> أضف للسلة
                    </button>
                    <button onClick={() => remove(item.id, p.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
