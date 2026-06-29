"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { Package, ChevronLeft, Clock, Truck, CheckCircle } from "lucide-react";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TABS = [
  { key:"active",    label:"النشطة",     statuses:["assigned","picked_up"] },
  { key:"delivered", label:"المُسلَّمة", statuses:["delivered"] },
];

const STATUS_AR: Record<string,{label:string;icon:React.ElementType;color:string}> = {
  assigned:  { label:"مُسنَدة",     icon:Clock,        color:"bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  picked_up: { label:"تم الاستلام", icon:Truck,        color:"bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400"  },
  delivered: { label:"تم التوصيل", icon:CheckCircle,  color:"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
};

interface Shipment {
  id: string; status: string; assigned_at: string | null;
  orders: { order_number:string; address_snapshot:{governorate?:string;district?:string;full_name?:string} } | null;
}

export default function DriverOrdersPage() {
  const { user }   = useAuthStore();
  const [tab,  setTab]  = useState("active");
  const [items,setItems]= useState<Shipment[]>([]);
  const [loading, setLd]= useState(true);

  useEffect(() => {
    if (!user) return;
    setLd(true);
    const statuses = TABS.find(t => t.key === tab)?.statuses ?? [];
    sb.from("shipments")
      .select("id, status, assigned_at, orders(order_number, address_snapshot)")
      .eq("driver_id", user.id)
      .in("status", statuses)
      .order("assigned_at", { ascending: false })
      .then(({ data }) => { setItems(data as Shipment[] ?? []); setLd(false); });
  }, [user, tab]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-[var(--text-1)]">طلباتي</h1>

      {/* التبويبات */}
      <div className="flex gap-2 rounded-xl border border-[var(--border)] p-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              tab === t.key ? "bg-brand-700 text-white shadow" : "text-[var(--text-2)] hover:bg-[var(--border)]"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* القائمة */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-20 rounded-xl"/>)}</div>
      ) : items.length === 0 ? (
        <div className="card-base py-16 text-center">
          <Package size={40} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]"/>
          <p className="text-[var(--text-muted)]">
            {tab === "active" ? "لا توجد طلبات نشطة" : "لم تُسلَّم طلبات بعد"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(s => {
            const st = STATUS_AR[s.status];
            const Icon = st?.icon ?? Package;
            const o = s.orders;
            return (
              <Link key={s.id} href={`/driver/orders/${s.id}`}
                className="card-base flex items-center gap-4 p-4 hover:border-brand-300 transition-all">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${st?.color ?? ""}`}>
                  <Icon size={20}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[var(--text-1)]" dir="ltr">{o?.order_number ?? "—"}</p>
                  <p className="text-sm text-[var(--text-2)] truncate">
                    {o?.address_snapshot?.full_name && `${o.address_snapshot.full_name} · `}
                    {o?.address_snapshot?.governorate}
                    {o?.address_snapshot?.district ? ` · ${o.address_snapshot.district}` : ""}
                  </p>
                  {s.assigned_at && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {new Date(s.assigned_at).toLocaleString("ar-YE")}
                    </p>
                  )}
                </div>
                <ChevronLeft size={16} className="text-[var(--text-muted)] shrink-0"/>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
