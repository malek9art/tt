"use client";
import { useCartStore } from "@/store/cartStore";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/api";

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQty, totalItems, totalPrice } = useCartStore();
  const count = totalItems();
  const total = totalPrice();

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={closeCart} />
      <div className="fixed inset-y-0 start-0 z-50 flex w-full max-w-sm flex-col bg-[var(--bg-card)] shadow-2xl">
        {/* رأس */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-brand-700" />
            <h2 className="font-bold text-[var(--text-1)]">السلة</h2>
            {count > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-700 text-[11px] font-bold text-white">{count}</span>
            )}
          </div>
          <button onClick={closeCart}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-2)] hover:bg-[var(--border)] transition-colors">
            <X size={18} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="text-5xl">🛒</div>
            <p className="font-semibold text-[var(--text-1)]">السلة فارغة</p>
            <p className="text-sm text-[var(--text-muted)]">أضف منتجات لتبدأ التسوق</p>
            <button onClick={closeCart} className="btn-primary">تسوّق الآن</button>
          </div>
        ) : (
          <>
            {/* العناصر */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {items.map(item => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-brand-50">
                    <Image src={item.image} alt={item.name_ar} fill sizes="64px" className="object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <p className="line-clamp-2 text-sm font-medium text-[var(--text-1)] leading-snug">{item.name_ar}</p>
                    {Object.keys(item.attributes).length > 0 && (
                      <p className="text-xs text-[var(--text-muted)]">{Object.values(item.attributes).join(" / ")}</p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-bold text-brand-700 dark:text-accent-400">
                        {formatPrice(item.price * item.quantity, item.currency)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(item.id, item.quantity - 1)}
                          className="flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] hover:border-brand-500 transition-colors">
                          <Minus size={11} />
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, item.quantity + 1)}
                          className="flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] hover:border-brand-500 transition-colors">
                          <Plus size={11} />
                        </button>
                        <button onClick={() => removeItem(item.id)}
                          className="flex h-6 w-6 items-center justify-center rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mr-1">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* التذييل */}
            <div className="border-t border-[var(--border)] px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-2)]">المجموع ({count} منتج)</span>
                <span className="text-lg font-bold text-brand-700 dark:text-accent-400">
                  {formatPrice(total, items[0]?.currency ?? "YER")}
                </span>
              </div>
              <Link href="/checkout" onClick={closeCart} className="btn-primary w-full justify-center text-base">
                إتمام الطلب
              </Link>
              <button onClick={closeCart} className="btn-ghost w-full justify-center text-sm">
                متابعة التسوق
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
