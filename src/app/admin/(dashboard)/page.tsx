"use client";
import { useEffect, useState } from "react";
import { ShoppingBag, Package, Users, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";

const STATUS_AR: Record<string, { label: string; color: string }> = {
  pending:            { label: "معلّق",        color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  confirmed:          { label: "مؤكد",         color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  processing:         { label: "قيد التجهيز",  color: "bg-indigo-100 text-indigo-700" },
  ready_for_delivery: { label: "جاهز",          color: "bg-purple-100 text-purple-700" },
  out_for_delivery:   { label: "في الطريق",    color: "bg-orange-100 text-orange-700" },
  delivered:          { label: "تم التوصيل",   color: "bg-green-100 text-green-700" },
  completed:          { label: "مكتمل",        color: "bg-green-100 text-green-800" },
  cancelled:          { label: "ملغي",         color: "bg-red-100 text-red-700" },
};

interface Stats {
  totalOrders: number; totalProducts: number;
  totalCustomers: number; totalRevenue: number; pendingOrders: number;
}

interface Order {
  id: string; order_number: string; status: string;
  payment_status: string; total_amount: number; currency: string; created_at: string;
}

export default function AdminDashboard() {
  const [stats,  setStats]  = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then(r => r.json())
      .then(d => { setStats(d.stats); setOrders(d.recentOrders ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const formatYER = (n: number) =>
    new Intl.NumberFormat("ar-YE", { style: "decimal", maximumFractionDigits: 0 }).format(n) + " ﷼";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-1)]">لوحة التحكم</h1>
        <p className="text-sm text-[var(--text-muted)]">نظرة عامة على المتجر</p>
      </div>

      {/* البطاقات الإحصائية */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "إجمالي الطلبات",  value: stats?.totalOrders,    icon: ShoppingBag, color: "bg-blue-50 dark:bg-blue-900/20 text-blue-600",   href: "/admin/orders" },
          { label: "المنتجات النشطة", value: stats?.totalProducts,   icon: Package,     color: "bg-green-50 dark:bg-green-900/20 text-green-600",  href: "/admin/products" },
          { label: "العملاء",          value: stats?.totalCustomers,  icon: Users,       color: "bg-purple-50 dark:bg-purple-900/20 text-purple-600",href: "/admin/customers" },
          { label: "طلبات معلّقة",    value: stats?.pendingOrders,   icon: Clock,       color: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600", href: "/admin/orders?status=pending" },
        ].map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href}
            className="card-base p-5 flex items-center gap-4 hover:border-brand-300 transition-all group">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">{label}</p>
              {loading
                ? <div className="skeleton h-7 w-16 mt-1" />
                : <p className="text-2xl font-bold text-[var(--text-1)]">{value?.toLocaleString("ar") ?? 0}</p>}
            </div>
          </Link>
        ))}
      </div>

      {/* الإيرادات */}
      <div className="card-base p-5 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-700">
          <TrendingUp size={22} />
        </div>
        <div>
          <p className="text-sm text-[var(--text-muted)]">إجمالي الإيرادات (المدفوعة)</p>
          {loading
            ? <div className="skeleton h-8 w-40 mt-1" />
            : <p className="text-3xl font-bold text-brand-700 dark:text-accent-400">
                {formatYER(stats?.totalRevenue ?? 0)}
              </p>}
        </div>
      </div>

      {/* آخر الطلبات */}
      <div className="card-base overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-bold text-[var(--text-1)]">آخر الطلبات</h2>
          <Link href="/admin/orders" className="text-sm text-brand-700 hover:text-brand-900 dark:text-accent-400 transition-colors">
            عرض الكل
          </Link>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3].map(i => <div key={i} className="skeleton h-12 w-full" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-muted)]">
            <ShoppingBag size={36} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد طلبات بعد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-page)]">
                <tr>
                  {["رقم الطلب","الحالة","المبلغ","التاريخ",""].map(h => (
                    <th key={h} className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {orders.map(order => {
                  const st = STATUS_AR[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-600" };
                  return (
                    <tr key={order.id} className="hover:bg-[var(--bg-page)] transition-colors">
                      <td className="px-4 py-3 font-medium text-[var(--text-1)]" dir="ltr">{order.order_number}</td>
                      <td className="px-4 py-3">
                        <span className={`badge px-2.5 py-1 text-xs ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-brand-700 dark:text-accent-400">
                        {new Intl.NumberFormat("ar-YE").format(order.total_amount)} ﷼
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        {new Date(order.created_at).toLocaleDateString("ar-YE")}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/orders/${order.id}`}
                          className="text-xs text-brand-700 dark:text-accent-400 hover:underline">
                          عرض
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
