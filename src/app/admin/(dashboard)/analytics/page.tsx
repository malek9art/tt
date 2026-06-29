"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { TrendingUp, ShoppingBag, Users, Package } from "lucide-react";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface DailyStat { day: string; orders: number; revenue: number; }

export default function AnalyticsPage() {
  const [stats,  setStats]  = useState({ orders:0, revenue:0, customers:0, products:0 });
  const [daily,  setDaily]  = useState<DailyStat[]>([]);
  const [topProd,setTopProd]= useState<{name:string; count:number}[]>([]);
  const [loading,setLoading]= useState(true);

  useEffect(() => {
    Promise.all([
      sb.from("orders").select("total_amount, created_at, status"),
      sb.from("profiles").select("id", { count:"exact", head:true }),
      sb.from("products").select("id", { count:"exact", head:true }).eq("status","published"),
      sb.from("order_items").select("name_snapshot, quantity"),
    ]).then(([ordRes, custRes, prodRes, itemsRes]) => {
      const orders = ordRes.data ?? [];
      const revenue = orders.reduce((s,o) => s + Number(o.total_amount), 0);

      // مبيعات آخر 7 أيام
      const days: Record<string, DailyStat> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        days[key] = { day: d.toLocaleDateString("ar-YE", { weekday:"short", day:"numeric" }), orders:0, revenue:0 };
      }
      orders.forEach(o => {
        const key = o.created_at?.split("T")[0];
        if (key && days[key]) {
          days[key].orders++;
          days[key].revenue += Number(o.total_amount);
        }
      });

      // أكثر المنتجات مبيعاً
      const counter: Record<string,number> = {};
      (itemsRes.data ?? []).forEach(i => {
        counter[i.name_snapshot] = (counter[i.name_snapshot] ?? 0) + i.quantity;
      });
      const top = Object.entries(counter)
        .sort((a,b) => b[1]-a[1])
        .slice(0,5)
        .map(([name,count]) => ({ name, count }));

      setStats({ orders: orders.length, revenue, customers: custRes.count??0, products: prodRes.count??0 });
      setDaily(Object.values(days));
      setTopProd(top);
      setLoading(false);
    });
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat("ar-YE", { maximumFractionDigits:0 }).format(n) + " ﷼";

  const maxRev = Math.max(...daily.map(d => d.revenue), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-1)]">التحليلات</h1>
        <p className="text-sm text-[var(--text-muted)]">نظرة على أداء المتجر</p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* بطاقات إحصائية */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label:"إجمالي الإيرادات", value:fmt(stats.revenue),        icon:TrendingUp, color:"text-green-600  bg-green-50 dark:bg-green-900/20"   },
              { label:"الطلبات",           value:stats.orders.toString(),   icon:ShoppingBag,color:"text-blue-600   bg-blue-50  dark:bg-blue-900/20"    },
              { label:"العملاء",           value:stats.customers.toString(),icon:Users,      color:"text-purple-600 bg-purple-50 dark:bg-purple-900/20" },
              { label:"المنتجات النشطة",  value:stats.products.toString(), icon:Package,    color:"text-brand-700  bg-brand-50 dark:bg-brand-900/30"   },
            ].map(({ label, value, icon:Icon, color }) => (
              <div key={label} className="card-base p-5 flex items-center gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}>
                  <Icon size={22} />
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">{label}</p>
                  <p className="text-xl font-bold text-[var(--text-1)]">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* مخطط المبيعات اليومية (Bars CSS) */}
          <div className="card-base p-5">
            <h2 className="font-semibold text-[var(--text-1)] mb-5">مبيعات آخر 7 أيام</h2>
            <div className="flex items-end gap-3 h-40">
              {daily.map(d => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">
                    {d.revenue > 0 ? new Intl.NumberFormat("ar-YE",{notation:"compact"}).format(d.revenue)+"﷼" : ""}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-brand-700 dark:bg-accent-500 transition-all hover:opacity-80"
                    style={{ height: `${Math.max((d.revenue / maxRev) * 100, d.revenue > 0 ? 8 : 2)}%` }}
                    title={`${d.orders} طلب · ${fmt(d.revenue)}`}
                  />
                  <span className="text-[9px] text-[var(--text-muted)] text-center leading-tight">{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* أكثر المنتجات مبيعاً */}
          <div className="card-base p-5">
            <h2 className="font-semibold text-[var(--text-1)] mb-4">أكثر المنتجات مبيعاً</h2>
            {topProd.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-6">لا توجد مبيعات بعد</p>
            ) : (
              <div className="space-y-3">
                {topProd.map((p, i) => {
                  const maxCount = topProd[0].count;
                  return (
                    <div key={p.name} className="flex items-center gap-3">
                      <span className="w-5 text-center text-xs font-bold text-[var(--text-muted)]">{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-1)] truncate">{p.name}</p>
                        <div className="mt-1 h-1.5 rounded-full bg-[var(--border)]">
                          <div
                            className="h-full rounded-full bg-brand-700 dark:bg-accent-500"
                            style={{ width: `${(p.count/maxCount)*100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-[var(--text-1)] shrink-0">{p.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
