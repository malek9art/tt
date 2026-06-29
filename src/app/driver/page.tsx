"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { Package, CheckCircle, Clock, TrendingUp, ChevronLeft } from "lucide-react";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Stats { pending:number; today:number; total:number; rating:number|null; }

export default function DriverHome() {
  const { user, profile } = useAuthStore();
  const [stats,   setStats]   = useState<Stats>({ pending:0, today:0, total:0, rating:null });
  const [pending, setPending] = useState<{id:string;orders:{order_number:string;address_snapshot:{governorate?:string;district?:string}}}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      sb.from("shipments").select("id, orders(order_number, address_snapshot)")
        .eq("driver_id", user.id)
        .in("status", ["assigned","picked_up"])
        .order("assigned_at"),
      sb.from("shipments").select("id", { count:"exact", head:true })
        .eq("driver_id", user.id).in("status", ["assigned","picked_up"]),
      sb.from("shipments").select("id", { count:"exact", head:true })
        .eq("driver_id", user.id).eq("status","delivered")
        .gte("delivered_at", new Date().toISOString().split("T")[0]),
      sb.from("drivers").select("total_deliveries, rating").eq("id", user.id).single(),
    ]).then(([pendRes, pendCount, todayRes, driverRes]) => {
      setPending(pendRes.data as typeof pending ?? []);
      setStats({
        pending: pendCount.count ?? 0,
        today:   todayRes.count ?? 0,
        total:   driverRes.data?.total_deliveries ?? 0,
        rating:  driverRes.data?.rating ?? null,
      });
      setLoading(false);
    });
  }, [user]);

  return (
    <div className="space-y-5">
      {/* الترحيب */}
      <div className="rounded-2xl bg-gradient-to-l from-brand-700 to-brand-800 p-5 text-white">
        <p className="text-sm text-brand-200">مرحباً،</p>
        <h1 className="text-xl font-bold mt-0.5">{profile?.full_name ?? "المندوب"}</h1>
        <p className="text-brand-200 text-sm mt-1">
          {new Date().toLocaleDateString("ar-YE", { weekday:"long", day:"numeric", month:"long" })}
        </p>
      </div>

      {/* الإحصاءات */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i=><div key={i} className="skeleton h-20 rounded-xl"/>)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label:"طلبات معلّقة",  value:stats.pending, icon:Clock,        color:"bg-amber-50 dark:bg-amber-900/20 text-amber-600"  },
            { label:"توصيل اليوم",  value:stats.today,   icon:CheckCircle,  color:"bg-green-50 dark:bg-green-900/20 text-green-600"  },
            { label:"إجمالي التوصيل",value:stats.total,   icon:Package,      color:"bg-blue-50  dark:bg-blue-900/20  text-blue-600"   },
            { label:"التقييم",       value:stats.rating ? stats.rating.toFixed(1) : "—", icon:TrendingUp, color:"bg-purple-50 dark:bg-purple-900/20 text-purple-600" },
          ].map(({ label, value, icon:Icon, color }) => (
            <div key={label} className="card-base p-4 flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
                <Icon size={18}/>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">{label}</p>
                <p className="text-lg font-bold text-[var(--text-1)]">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* الطلبات المعلّقة */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-[var(--text-1)]">طلباتي الحالية</h2>
          <Link href="/driver/orders" className="text-sm text-brand-700 dark:text-accent-400">
            عرض الكل <ChevronLeft size={14} className="inline"/>
          </Link>
        </div>
        {loading ? (
          <div className="space-y-3">{[1,2].map(i=><div key={i} className="skeleton h-16 rounded-xl"/>)}</div>
        ) : pending.length === 0 ? (
          <div className="card-base py-10 text-center">
            <Package size={32} className="mx-auto mb-2 opacity-20 text-[var(--text-muted)]"/>
            <p className="text-[var(--text-muted)] text-sm">لا توجد طلبات معلّقة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.slice(0, 3).map(s => {
              const o = s.orders as { order_number:string; address_snapshot:{governorate?:string;district?:string} };
              return (
                <Link key={s.id} href={`/driver/orders/${s.id}`}
                  className="card-base flex items-center gap-3 p-4 hover:border-brand-300 transition-all">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-700">
                    <Package size={18}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--text-1)]" dir="ltr">{o?.order_number}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      {o?.address_snapshot?.governorate}{o?.address_snapshot?.district ? ` · ${o.address_snapshot.district}` : ""}
                    </p>
                  </div>
                  <ChevronLeft size={16} className="text-[var(--text-muted)]"/>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
