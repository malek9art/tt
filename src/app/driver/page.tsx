"use client";
import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Truck, MapPin, Phone, Clock, LogOut, Package, RefreshCw, CheckCircle } from "lucide-react";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STATUS_STYLE: Record<string,{label:string;color:string}> = {
  pending:          { label:"معلّق",       color:"bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  assigned:         { label:"مسنَد لك",    color:"bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  picked_up:        { label:"تم الاستلام", color:"bg-indigo-100 text-indigo-700" },
  out_for_delivery: { label:"في الطريق",   color:"bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  delivered:        { label:"تم التوصيل",  color:"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  failed:           { label:"فشل",          color:"bg-red-100 text-red-700" },
  returned:         { label:"مُرتجَع",      color:"bg-purple-100 text-purple-700" },
};

interface OrderSnap {
  order_number:     string;
  total_amount:     number;
  currency:         string;
  address_snapshot: {
    full_name:   string;
    phone:       string;
    governorate: string;
    district?:   string;
    street?:     string;
  };
}

// Supabase يُعيد joined rows كـ array أو object — نعالج الحالتين
type OrderField = OrderSnap | OrderSnap[] | null;

interface Shipment {
  id:              string;
  tracking_number: string;
  status:          string;
  carrier_notes:   string | null;
  created_at:      string;
  orders:          OrderField;
}

function getOrderData(orders: OrderField): OrderSnap | null {
  if (!orders) return null;
  return Array.isArray(orders) ? orders[0] ?? null : orders;
}

export default function DriverDashboard() {
  const router = useRouter();
  const [shipments,  setShipments]  = useState<Shipment[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [driverName, setDriverName] = useState("المندوب");
  const [filter,     setFilter]     = useState<"active"|"done">("active");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { router.replace("/driver/login"); return; }

    const { data: profile } = await sb.from("profiles").select("full_name").eq("id", user.id).single();
    if (profile?.full_name) setDriverName(profile.full_name);

    const { data } = await sb
      .from("shipments")
      .select(`
        id, tracking_number, status, carrier_notes, created_at,
        orders(order_number, total_amount, currency, address_snapshot)
      `)
      .eq("driver_id", user.id)
      .order("created_at", { ascending: false });

    setShipments((data as unknown as Shipment[]) ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const handleSignOut = async () => {
    await sb.auth.signOut();
    router.replace("/driver/login");
  };

  const active = shipments.filter(s => !["delivered","failed","returned"].includes(s.status));
  const done   = shipments.filter(s =>  ["delivered","failed","returned"].includes(s.status));
  const shown  = filter === "active" ? active : done;

  return (
    <div className="min-h-screen bg-[var(--bg-page)]" dir="rtl">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-card)] px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-white">
            <Truck size={18}/>
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text-1)]">{driverName}</p>
            <p className="text-[10px] text-[var(--text-muted)]">مندوب توصيل</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-2)] hover:bg-[var(--border)] transition-colors">
            <RefreshCw size={16}/>
          </button>
          <button onClick={handleSignOut} className="flex h-8 w-8 items-center justify-center rounded-full text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <LogOut size={16}/>
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label:"إجمالي", value:shipments.length, color:"text-[var(--text-1)]" },
            { label:"نشطة",   value:active.length,    color:"text-amber-600"       },
            { label:"مكتملة", value:done.length,      color:"text-green-600"       },
          ].map(({ label, value, color }) => (
            <div key={label} className="card-base p-3 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-[var(--text-muted)]">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--border)] p-1">
          {[
            { v:"active", l:`نشطة (${active.length})` },
            { v:"done",   l:`مكتملة (${done.length})` },
          ].map(({ v, l }) => (
            <button key={v} onClick={()=>setFilter(v as typeof filter)}
              className={`rounded-lg py-2 text-sm font-medium transition-all ${
                filter===v ? "bg-brand-700 text-white shadow" : "text-[var(--text-2)] hover:bg-[var(--border)]"
              }`}>{l}</button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-28 w-full rounded-xl"/>)}</div>
        ) : shown.length === 0 ? (
          <div className="card-base py-14 text-center">
            <Package size={40} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]"/>
            <p className="font-semibold text-[var(--text-1)]">
              {filter==="active" ? "لا توجد شحنات نشطة" : "لا توجد شحنات مكتملة"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map(shipment => {
              const orderData = getOrderData(shipment.orders);
              const addr = orderData?.address_snapshot;
              const st   = STATUS_STYLE[shipment.status] ?? { label:shipment.status, color:"bg-gray-100 text-gray-600" };
              return (
                <Link key={shipment.id} href={`/driver/orders/${shipment.id}`}
                  className="card-base block p-4 hover:border-brand-300 transition-all active:scale-[0.99]">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-[var(--text-1)]" dir="ltr">#{orderData?.order_number}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5" dir="ltr">{shipment.tracking_number}</p>
                    </div>
                    <span className={`badge text-xs px-2.5 py-1 ${st.color}`}>{st.label}</span>
                  </div>
                  {addr && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                        <MapPin size={13} className="shrink-0 text-brand-700"/>
                        {addr.governorate}{addr.district && ` · ${addr.district}`}
                        {addr.street && ` · ${addr.street}`}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                        <Phone size={13} className="shrink-0 text-brand-700"/>
                        <span dir="ltr">{addr.phone}</span>
                        <span className="text-[var(--text-muted)]">— {addr.full_name}</span>
                      </div>
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                      <Clock size={11}/>
                      {new Date(shipment.created_at).toLocaleDateString("ar-YE")}
                    </span>
                    <span className="text-sm font-bold text-brand-700 dark:text-accent-400">
                      {new Intl.NumberFormat("ar-YE").format(orderData?.total_amount ?? 0)} ﷼
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
