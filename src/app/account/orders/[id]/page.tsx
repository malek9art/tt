"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useAuthStore } from "@/store/authStore";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { Package, MapPin, CreditCard, Clock, ChevronLeft } from "lucide-react";
import { formatPrice } from "@/lib/api";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STATUS: Record<string, { label: string; color: string }> = {
  pending:            { label: "قيد المعالجة",   color: "bg-yellow-100 text-yellow-700" },
  confirmed:          { label: "مؤكد",           color: "bg-blue-100 text-blue-700" },
  processing:         { label: "جارٍ التجهيز",   color: "bg-indigo-100 text-indigo-700" },
  ready_for_delivery: { label: "جاهز للتسليم",   color: "bg-purple-100 text-purple-700" },
  out_for_delivery:   { label: "في الطريق",      color: "bg-orange-100 text-orange-700" },
  delivered:          { label: "تم التوصيل",     color: "bg-green-100 text-green-700" },
  completed:          { label: "مكتمل",          color: "bg-green-100 text-green-800" },
  cancelled:          { label: "ملغي",           color: "bg-red-100 text-red-700" },
};

export default function OrderDetailPage() {
  const params      = useParams();
  const router      = useRouter();
  const { user }    = useAuthStore();
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    supabase
      .from("orders")
      .select(`*, order_items(*)`)
      .eq("id", params.id as string)
      .eq("customer_id", user.id)
      .single()
      .then(({ data }) => { setOrder(data); setLoading(false); });
  }, [user, router, params.id]);

  if (loading) return (
    <div className="min-h-screen"><Header />
      <div className="container-main py-12 space-y-4">
        {[1,2,3].map(i => <div key={i} className="skeleton h-20 w-full" />)}
      </div>
      <Footer />
    </div>
  );

  if (!order) return (
    <div className="min-h-screen"><Header />
      <div className="container-main py-20 text-center">
        <p className="text-5xl mb-4">🔍</p>
        <p className="font-bold text-[var(--text-1)] mb-4">الطلب غير موجود</p>
        <Link href="/account/orders" className="btn-primary">طلباتي</Link>
      </div>
      <Footer />
    </div>
  );

  const st = STATUS[order.status as string] ?? { label: order.status as string, color: "bg-gray-100 text-gray-600" };
  const addr = order.address_snapshot as Record<string, string>;
  const items = order.order_items as { name_snapshot: string; quantity: number; price: number; subtotal: number }[];

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container-main py-8 max-w-2xl">
        <nav className="mb-6 text-sm text-[var(--text-muted)]">
          <Link href="/account" className="hover:text-brand-700">حسابي</Link>
          <span className="mx-2">/</span>
          <Link href="/account/orders" className="hover:text-brand-700">طلباتي</Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--text-1)]" dir="ltr">{order.order_number as string}</span>
        </nav>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-1)]" dir="ltr">{order.order_number as string}</h1>
          <span className={`badge text-sm px-3 py-1 ${st.color}`}>{st.label}</span>
        </div>

        <div className="space-y-4">
          {/* عناصر الطلب */}
          <div className="card-base p-5">
            <h2 className="font-bold text-[var(--text-1)] mb-3 flex items-center gap-2">
              <Package size={18} className="text-brand-700" /> المنتجات
            </h2>
            <div className="space-y-3">
              {items?.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-1)]">{item.name_snapshot}</p>
                    <p className="text-xs text-[var(--text-muted)]">الكمية: {item.quantity} × {formatPrice(item.price, order.currency as string)}</p>
                  </div>
                  <span className="font-bold text-sm text-brand-700 dark:text-accent-400">
                    {formatPrice(item.subtotal, order.currency as string)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ملخص المبالغ */}
          <div className="card-base p-5">
            <h2 className="font-bold text-[var(--text-1)] mb-3 flex items-center gap-2">
              <CreditCard size={18} className="text-brand-700" /> ملخص المبلغ
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-[var(--text-2)]">
                <span>المنتجات</span>
                <span>{formatPrice(order.subtotal as number, order.currency as string)}</span>
              </div>
              <div className="flex justify-between text-[var(--text-2)]">
                <span>الشحن</span>
                <span className={(order.shipping_fee as number) === 0 ? "text-green-600 font-medium" : ""}>
                  {(order.shipping_fee as number) === 0 ? "مجاني" : formatPrice(order.shipping_fee as number, order.currency as string)}
                </span>
              </div>
              <div className="border-t border-[var(--border)] pt-2 flex justify-between font-bold text-[var(--text-1)]">
                <span>الإجمالي</span>
                <span className="text-brand-700 dark:text-accent-400">{formatPrice(order.total_amount as number, order.currency as string)}</span>
              </div>
            </div>
          </div>

          {/* عنوان التوصيل */}
          {addr && (
            <div className="card-base p-5">
              <h2 className="font-bold text-[var(--text-1)] mb-3 flex items-center gap-2">
                <MapPin size={18} className="text-brand-700" /> عنوان التوصيل
              </h2>
              <p className="text-sm text-[var(--text-2)]">{addr.full_name} · {addr.phone}</p>
              {addr.governorate && <p className="text-sm text-[var(--text-2)]">{addr.governorate}{addr.district && ` · ${addr.district}`}</p>}
              {addr.street && <p className="text-sm text-[var(--text-2)]">{addr.street}</p>}
            </div>
          )}

          {/* تاريخ الطلب */}
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] px-1">
            <Clock size={14} />
            <span>تاريخ الطلب: {new Date(order.created_at as string).toLocaleDateString("ar-YE", { dateStyle: "long" })}</span>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
