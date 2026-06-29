"use client";
import { useEffect, useState } from "react";
import {
  TrendingUp, ShoppingBag, Users, Package,
  RefreshCw, Calendar
} from "lucide-react";

interface DaySale { date: string; revenue: number; orders: number; }
interface TopProduct { name: string; qty: number; revenue: number; }
interface Summary {
  totalRevenue: number; totalOrders: number;
  totalProducts: number; newCustomers: number;
}

const DAY_OPTIONS = [
  { v:7,  l:"آخر 7 أيام"  },
  { v:14, l:"آخر 14 يوم" },
  { v:30, l:"آخر 30 يوم" },
];

const ORDER_STATUS_AR: Record<string,string> = {
  pending:"معلّق", confirmed:"مؤكد", processing:"قيد التجهيز",
  ready_for_delivery:"جاهز", out_for_delivery:"في الطريق",
  delivered:"تم التوصيل", completed:"مكتمل",
  cancelled:"ملغي", returned:"مُرتجَع",
};

export const metadata = { title: "التحليلات" };

export default function AnalyticsPage() {
  const [days,        setDays]        = useState(7);
  const [summary,     setSummary]     = useState<Summary|null>(null);
  const [dailySales,  setDailySales]  = useState<DaySale[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [byStatus,    setByStatus]    = useState<Record<string,number>>({});
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics?days=${days}`)
      .then(r => r.json())
      .then(d => {
        setSummary(d.summary);
        setDailySales(d.dailySales ?? []);
        setTopProducts(d.topProducts ?? []);
        setByStatus(d.ordersByStatus ?? {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [days]);

  const maxRevenue = Math.max(...dailySales.map(d => d.revenue), 1);
  const formatYER  = (n: number) =>
    new Intl.NumberFormat("ar-YE", { maximumFractionDigits: 0 }).format(n) + " ﷼";

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-1)]">التحليلات</h1>
          <p className="text-sm text-[var(--text-muted)]">نظرة عامة على أداء المتجر</p>
        </div>
        <div className="flex gap-2 items-center">
          <Calendar size={15} className="text-[var(--text-muted)]"/>
          {DAY_OPTIONS.map(o => (
            <button key={o.v} onClick={() => setDays(o.v)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                days === o.v ? "bg-brand-700 text-white" : "border border-[var(--border)] text-[var(--text-2)] hover:border-brand-300"
              }`}>{o.l}</button>
          ))}
        </div>
      </div>

      {/* بطاقات الملخص */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          [1,2,3,4].map(i => <div key={i} className="skeleton h-28 w-full rounded-xl"/>)
        ) : [
          { label:"إجمالي الإيرادات", value:formatYER(summary?.totalRevenue ?? 0),
            icon:TrendingUp, color:"text-brand-700 dark:text-accent-400", bg:"bg-brand-50 dark:bg-brand-900/30" },
          { label:"الطلبات",           value:String(summary?.totalOrders ?? 0),
            icon:ShoppingBag,  color:"text-blue-600",  bg:"bg-blue-50 dark:bg-blue-900/20" },
          { label:"العملاء الجدد",     value:String(summary?.newCustomers ?? 0),
            icon:Users,        color:"text-purple-600",bg:"bg-purple-50 dark:bg-purple-900/20" },
          { label:"المنتجات النشطة",  value:String(summary?.totalProducts ?? 0),
            icon:Package,      color:"text-green-600", bg:"bg-green-50 dark:bg-green-900/20" },
        ].map(({ label, value, icon:Icon, color, bg }) => (
          <div key={label} className="card-base p-5">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl mb-3 ${bg}`}>
              <Icon size={20} className={color}/>
            </div>
            <p className="text-xs text-[var(--text-muted)]">{label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* مخطط المبيعات اليومية */}
      <div className="card-base p-5">
        <h2 className="font-semibold text-[var(--text-1)] mb-5">
          المبيعات اليومية — آخر {days} أيام
        </h2>
        {loading ? (
          <div className="skeleton h-48 w-full rounded-lg"/>
        ) : dailySales.length === 0 ? (
          <div className="py-12 text-center text-[var(--text-muted)]">
            <TrendingUp size={32} className="mx-auto mb-2 opacity-20"/>
            لا توجد بيانات
          </div>
        ) : (
          <div className="flex items-end gap-1 h-48 px-1">
            {dailySales.map(day => {
              const h = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
              const date = new Date(day.date).toLocaleDateString("ar-YE", { day:"numeric", month:"short" });
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group">
                  {/* Tooltip */}
                  <div className="hidden group-hover:block absolute -translate-y-full bg-brand-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap z-10">
                    {date}: {formatYER(day.revenue)} ({day.orders} طلب)
                  </div>
                  <div className="relative w-full flex flex-col justify-end" style={{ height:"160px" }}>
                    <div
                      className="w-full rounded-t-sm transition-all duration-300 cursor-pointer"
                      style={{
                        height: `${Math.max(h, day.revenue > 0 ? 4 : 0)}%`,
                        background: day.revenue > 0
                          ? "linear-gradient(180deg, #09444C, #0a5561)"
                          : "var(--border)",
                      }}
                      title={`${date}: ${formatYER(day.revenue)} (${day.orders} طلب)`}
                    />
                  </div>
                  <span className="text-[9px] text-[var(--text-muted)] text-center leading-tight">
                    {date}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* أكثر المنتجات مبيعاً */}
        <div className="card-base p-5">
          <h2 className="font-semibold text-[var(--text-1)] mb-4">أكثر المنتجات مبيعاً</h2>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-10 w-full"/>)}</div>
          ) : topProducts.length === 0 ? (
            <div className="py-8 text-center text-[var(--text-muted)] text-sm">لا توجد بيانات</div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0 ? "bg-accent-500 text-brand-900"
                    : i === 1 ? "bg-brand-200 text-brand-800"
                    : "bg-[var(--border)] text-[var(--text-muted)]"
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-1)] truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1 rounded-full bg-[var(--border)]">
                        <div className="h-1 rounded-full bg-brand-600"
                          style={{ width: `${(p.qty / (topProducts[0]?.qty || 1)) * 100}%` }}/>
                      </div>
                      <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                        {p.qty} وحدة
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-brand-700 dark:text-accent-400 whitespace-nowrap">
                    {formatYER(p.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* توزيع حالات الطلبات */}
        <div className="card-base p-5">
          <h2 className="font-semibold text-[var(--text-1)] mb-4">توزيع الطلبات حسب الحالة</h2>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-8 w-full"/>)}</div>
          ) : Object.keys(byStatus).length === 0 ? (
            <div className="py-8 text-center text-[var(--text-muted)] text-sm">لا توجد بيانات</div>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(byStatus)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => {
                  const total = Object.values(byStatus).reduce((s, n) => s + n, 0);
                  const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
                  const COLOR_MAP: Record<string,string> = {
                    pending:"bg-yellow-400", confirmed:"bg-blue-400",
                    delivered:"bg-green-500", completed:"bg-green-600",
                    cancelled:"bg-red-400", out_for_delivery:"bg-orange-400",
                    processing:"bg-indigo-400",
                  };
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-[var(--text-2)]">
                          {ORDER_STATUS_AR[status] ?? status}
                        </span>
                        <span className="text-sm font-semibold text-[var(--text-1)]">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[var(--border)]">
                        <div className={`h-1.5 rounded-full transition-all ${COLOR_MAP[status] ?? "bg-gray-400"}`}
                          style={{ width: `${pct}%` }}/>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
