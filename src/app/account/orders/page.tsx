"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, ChevronLeft, Clock } from "lucide-react";
import { formatPrice } from "@/lib/api";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:             { label: "قيد المعالجة",      color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  confirmed:           { label: "مؤكد",              color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  processing:          { label: "جارٍ التجهيز",      color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  ready_for_delivery:  { label: "جاهز للتسليم",      color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  out_for_delivery:    { label: "في الطريق إليك",    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  delivered:           { label: "تم التوصيل",        color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  completed:           { label: "مكتمل",             color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  cancelled:           { label: "ملغي",              color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  returned:            { label: "مُرتجع",            color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  refunded:            { label: "تم الاسترداد",      color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
};

interface Order {
  id: string; order_number: string; status: string;
  total_amount: number; currency: string; created_at: string;
  order_items: { name_snapshot: string; quantity: number }[];
}

export default function OrdersPage() {
  const router      = useRouter();
  const { user, loading: authLoading } = useAuthStore();
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return; // ننتظر تحميل الجلسة قبل الحكم
    if (!user) { router.replace("/login?redirectTo=/account/orders"); return; }
    supabase
      .from("orders")
      .select("id, order_number, status, total_amount, currency, created_at, order_items(name_snapshot, quantity)")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setOrders((data as Order[]) ?? []); setLoading(false); });
  }, [user, authLoading, router]);

  return (
    <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">طلباتي</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {loading ? "جارٍ التحميل..." : `${orders.length} طلب`}
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="skeleton h-24 w-full" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="card-base py-20 text-center">
            <Package size={48} className="mx-auto mb-4 opacity-20 text-[var(--text-muted)]" />
            <p className="font-semibold text-[var(--text-1)] mb-1">لا توجد طلبات بعد</p>
            <p className="text-sm text-[var(--text-muted)] mb-6">ابدأ التسوق لتظهر طلباتك هنا</p>
            <Link href="/products" className="btn-primary">تسوّق الآن</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const st = STATUS_LABELS[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-600" };
              const itemsPreview = order.order_items?.slice(0, 2).map(i => i.name_snapshot).join("، ");
              const moreItems = (order.order_items?.length ?? 0) - 2;
              return (
                <Link key={order.id} href={`/account/orders/${order.id}`}
                  className="card-base flex items-center gap-4 p-4 hover:border-brand-300 transition-all group">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-700">
                    <Package size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-[var(--text-1)] text-sm" dir="ltr">{order.order_number}</span>
                      <span className={`badge ${st.color}`}>{st.label}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] line-clamp-1">
                      {itemsPreview}{moreItems > 0 && ` و${moreItems} أخرى`}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-bold text-brand-700 dark:text-accent-400">
                        {formatPrice(order.total_amount, order.currency)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                        <Clock size={11} />
                        {new Date(order.created_at).toLocaleDateString("ar-YE")}
                      </span>
                    </div>
                  </div>
                  <ChevronLeft size={16} className="shrink-0 text-[var(--text-muted)] group-hover:text-brand-700 transition-colors" />
                </Link>
              );
            })}
          </div>
        )}
    </div>
  );
}
