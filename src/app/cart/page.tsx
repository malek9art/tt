"use client";
import { useCartStore } from "@/store/cartStore";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/api";

export default function CartPage() {
  const { items, removeItem, updateQty, clearCart, totalItems, totalPrice } = useCartStore();
  const count = totalItems();
  const total = totalPrice();
  const currency = items[0]?.currency ?? "YER";
  const shipping = total >= 50000 ? 0 : 2000;
  const grandTotal = total + shipping;

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container-main py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--text-1)]">
            سلة التسوق {count > 0 && <span className="text-base font-normal text-[var(--text-muted)]">({count} منتج)</span>}
          </h1>
          {items.length > 0 && (
            <button onClick={clearCart} className="text-sm text-red-500 hover:text-red-700 transition-colors">
              إفراغ السلة
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-20 text-center">
            <ShoppingBag size={56} className="mx-auto mb-4 text-[var(--border)]" />
            <h2 className="text-xl font-bold text-[var(--text-1)] mb-2">السلة فارغة</h2>
            <p className="text-[var(--text-muted)] mb-6">لم تضف أي منتج بعد</p>
            <Link href="/products" className="btn-primary">
              <ArrowRight size={16} /> تسوّق الآن
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* قائمة المنتجات */}
            <div className="lg:col-span-2 space-y-4">
              {items.map(item => (
                <div key={item.id} className="card-base p-4 flex gap-4">
                  <Link href={`/products/${item.product_id}`}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-brand-50">
                    <Image src={item.image} alt={item.name_ar} fill sizes="80px" className="object-cover" />
                  </Link>
                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div>
                      <h3 className="font-semibold text-[var(--text-1)] line-clamp-2 text-sm leading-snug">
                        {item.name_ar}
                      </h3>
                      {Object.keys(item.attributes).length > 0 && (
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          {Object.values(item.attributes).join(" / ")}
                        </p>
                      )}
                      {item.sku && (
                        <p className="text-xs text-[var(--text-muted)]">SKU: {item.sku}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2 border border-[var(--border)] rounded-lg p-1">
                        <button onClick={() => updateQty(item.id, item.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded text-[var(--text-2)] hover:bg-[var(--border)] transition-colors">
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-[var(--text-1)]">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, item.quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded text-[var(--text-2)] hover:bg-[var(--border)] transition-colors">
                          <Plus size={13} />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-brand-700 dark:text-accent-400">
                          {formatPrice(item.price * item.quantity, item.currency)}
                        </span>
                        <button onClick={() => removeItem(item.id)}
                          className="text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ملخص الطلب */}
            <div className="lg:col-span-1">
              <div className="card-base p-5 sticky top-24">
                <h2 className="mb-4 text-lg font-bold text-[var(--text-1)] border-b border-[var(--border)] pb-3">
                  ملخص الطلب
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-[var(--text-2)]">
                    <span>المجموع الفرعي ({count} منتج)</span>
                    <span>{formatPrice(total, currency)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--text-2)]">
                    <span>رسوم التوصيل</span>
                    <span className={shipping === 0 ? "text-green-600 font-medium" : ""}>
                      {shipping === 0 ? "مجاني" : formatPrice(shipping, currency)}
                    </span>
                  </div>
                  {shipping > 0 && (
                    <p className="text-xs text-[var(--text-muted)]">
                      أضف {formatPrice(50000 - total, currency)} للحصول على شحن مجاني
                    </p>
                  )}
                  <div className="border-t border-[var(--border)] pt-3 flex justify-between font-bold text-base text-[var(--text-1)]">
                    <span>الإجمالي</span>
                    <span className="text-brand-700 dark:text-accent-400">{formatPrice(grandTotal, currency)}</span>
                  </div>
                </div>

                {/* كوبون خصم */}
                <div className="mt-4">
                  <div className="flex gap-2">
                    <input type="text" placeholder="كود الخصم"
                      className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors" />
                    <button className="btn-ghost border border-[var(--border)] text-sm px-3 py-2">تطبيق</button>
                  </div>
                </div>

                <Link href="/checkout"
                  className="btn-primary mt-4 w-full justify-center text-base">
                  إتمام الطلب
                </Link>
                <Link href="/products" className="btn-ghost mt-2 w-full justify-center text-sm">
                  متابعة التسوق
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
