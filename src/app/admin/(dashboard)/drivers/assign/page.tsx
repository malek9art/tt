"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import {
  ArrowRight, Package, Truck, CheckCircle,
  Loader2, MapPin, Clock, User, AlertTriangle
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STATUS_AR: Record<string,string> = {
  pending:"معلّق", confirmed:"مؤكد", processing:"قيد التجهيز",
  ready_for_delivery:"جاهز للتسليم",
};

interface PendingOrder {
  id:             string;
  order_number:   string;
  status:         string;
  total_amount:   number;
  created_at:     string;
  shipment_id:    string | null;
  driver_name:    string | null;
  address_snapshot: {
    full_name:   string;
    phone:       string;
    governorate: string;
    district:    string | null;
  };
}

interface Driver {
  driver_id:       string;
  full_name:       string;
  phone:           string;
  vehicle_type:    string;
  coverage_zone:   string;
  status:          string;
  is_active:       boolean;
  active_shipments: number;
  max_orders:      number;
}

function AssignContent() {
  const searchParams = useSearchParams();
  const preDriver    = searchParams.get("driver") ?? "";

  const [orders,      setOrders]      = useState<PendingOrder[]>([]);
  const [drivers,     setDrivers]     = useState<Driver[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selectedOrders, setSelOrders] = useState<Set<string>>(new Set());
  const [selectedDriver, setSelDriver] = useState(preDriver);
  const [assigning,   setAssigning]   = useState(false);
  const [results,     setResults]     = useState<{order:string;ok:boolean;msg:string}[]>([]);
  const [filterZone,  setFilterZone]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [ordRes, drRes] = await Promise.all([
      // طلبات تحتاج إسناد
      sb.from("orders")
        .select("id, order_number, status, total_amount, created_at, address_snapshot, shipments(id, driver_id, profiles(full_name))")
        .in("status", ["confirmed","processing","ready_for_delivery"])
        .order("created_at", { ascending: true })
        .limit(50),
      // مناديب
      fetch("/api/admin/drivers").then(r => r.json()),
    ]);

    const rawOrders = (ordRes.data ?? []).map((o: Record<string, unknown>) => {
      const shipArr = o.shipments as Record<string, unknown>[] | null;
      const ship    = Array.isArray(shipArr) ? shipArr[0] : (shipArr ?? null);
      return {
        id:               String(o.id),
        order_number:     String(o.order_number),
        status:           String(o.status),
        total_amount:     Number(o.total_amount),
        created_at:       String(o.created_at),
        shipment_id:      ship ? String((ship as Record<string, unknown>).id) : null,
        driver_name:      ship ? (() => {
          const prof = (ship as Record<string, unknown>).profiles as Record<string, unknown> | null;
          return prof ? String(prof.full_name ?? "") : null;
        })() : null,
        address_snapshot: o.address_snapshot as PendingOrder["address_snapshot"],
      } as PendingOrder;
    });

    setOrders(rawOrders);
    setDrivers(Array.isArray(drRes) ? drRes.filter((d: Driver) => d.is_active) : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleOrder = (id: string) => {
    setSelOrders(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleAssign = async () => {
    if (!selectedDriver || selectedOrders.size === 0) return;
    setAssigning(true);
    const newResults: typeof results = [];

    for (const orderId of selectedOrders) {
      const order    = orders.find(o => o.id === orderId);
      const shipId   = order?.shipment_id;

      if (!shipId) {
        // إنشاء شحنة أولاً ثم الإسناد
        const { data: newShip } = await sb.from("shipments")
          .insert({ order_id: orderId, status: "pending" })
          .select("id").single();

        if (!newShip) {
          newResults.push({ order: order?.order_number ?? orderId, ok: false, msg: "فشل إنشاء الشحنة" });
          continue;
        }

        const res = await fetch("/api/admin/drivers/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shipment_id: newShip.id, driver_id: selectedDriver }),
        });
        const d = await res.json();
        newResults.push({ order: order?.order_number ?? orderId, ok: d.success, msg: d.error ?? "تم الإسناد" });
      } else {
        const res = await fetch("/api/admin/drivers/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shipment_id: shipId, driver_id: selectedDriver }),
        });
        const d = await res.json();
        newResults.push({ order: order?.order_number ?? orderId, ok: d.success, msg: d.error ?? "تم الإسناد" });
      }
    }

    setResults(newResults);
    setAssigning(false);
    setSelOrders(new Set());
    load();
  };

  const driver     = drivers.find(d => d.driver_id === selectedDriver);
  const driverLoad = driver ? driver.active_shipments / (driver.max_orders || 1) : 0;
  const zones      = [...new Set(drivers.map(d => d.coverage_zone))];
  const filteredDrivers = filterZone
    ? drivers.filter(d => d.coverage_zone === filterZone)
    : drivers;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/drivers" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-2)] hover:border-brand-300 transition-colors">
          <ArrowRight size={16}/>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">إسناد الطلبات للمناديب</h1>
          <p className="text-xs text-[var(--text-muted)]">اختر طلبات ثم اختر مندوباً</p>
        </div>
      </div>

      {/* نتائج الإسناد */}
      {results.length > 0 && (
        <div className="card-base p-4 space-y-2">
          <h3 className="font-semibold text-[var(--text-1)] mb-3">نتائج الإسناد</h3>
          {results.map((r, i) => (
            <div key={i} className={`flex items-center gap-2 text-sm ${r.ok ? "text-green-600" : "text-red-600"}`}>
              {r.ok ? <CheckCircle size={14}/> : <AlertTriangle size={14}/>}
              <span dir="ltr">#{r.order}</span>
              <span>— {r.msg}</span>
            </div>
          ))}
          {(() => {
            const okOrders = results.filter(r => r.ok).map(r => r.order);
            if (okOrders.length === 0 || !driver?.phone) return null;
            const text = okOrders.length === 1
              ? `مرحباً ${driver.full_name}، لديك طلبية جديدة #${okOrders[0]} — توجّه إلى مركز الأحمدي لبدء إجراءات التوصيل`
              : `مرحباً ${driver.full_name}، لديك ${okOrders.length} طلبيات جديدة: ${okOrders.map(o => `#${o}`).join("، ")} — توجّه إلى مركز الأحمدي لبدء إجراءات التوصيل`;
            const href = `https://wa.me/${driver.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`;
            return (
              <a href={href} target="_blank" rel="noreferrer"
                className="btn-primary gap-2 bg-green-600 hover:bg-green-700 border-green-600 text-sm mt-2">
                <FaWhatsapp className="text-base"/> إرسال إشعار واتساب لـ{driver.full_name}
              </a>
            );
          })()}
          <button onClick={() => setResults([])} className="text-xs text-[var(--text-muted)] hover:text-brand-700 mt-2">
            إغلاق
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-20 w-full rounded-xl"/>)}</div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* === اختيار الطلبات === */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[var(--text-1)] flex items-center gap-2">
                <Package size={16} className="text-brand-700"/>
                الطلبات ({orders.length})
              </h2>
              {selectedOrders.size > 0 && (
                <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-accent-400 px-2.5 py-1 text-xs">
                  {selectedOrders.size} محدد
                </span>
              )}
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pe-1">
              {orders.length === 0 ? (
                <div className="card-base py-10 text-center text-[var(--text-muted)]">
                  <Package size={32} className="mx-auto mb-2 opacity-30"/>
                  لا توجد طلبات تحتاج إسناد
                </div>
              ) : orders.map(order => {
                const addr = order.address_snapshot;
                const isSelected = selectedOrders.has(order.id);
                return (
                  <button key={order.id} onClick={() => toggleOrder(order.id)}
                    className={`w-full text-right rounded-xl border p-3.5 transition-all ${
                      isSelected
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30"
                        : "border-[var(--border)] bg-[var(--bg-card)] hover:border-brand-300"
                    }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`h-4 w-4 rounded border-2 transition-all ${
                          isSelected ? "border-brand-700 bg-brand-700" : "border-[var(--border)]"
                        } flex items-center justify-center`}>
                          {isSelected && <CheckCircle size={10} className="text-white fill-white"/>}
                        </div>
                        <span className="font-bold text-sm text-[var(--text-1)]" dir="ltr">
                          #{order.order_number}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.driver_name && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-md">
                            مُسنَد: {order.driver_name}
                          </span>
                        )}
                        <span className="text-xs text-brand-700 dark:text-accent-400 font-semibold">
                          {new Intl.NumberFormat("ar-YE").format(order.total_amount)} ﷼
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <MapPin size={11}/> {addr?.governorate}{addr?.district && ` · ${addr.district}`}
                      <User size={11}/> {addr?.full_name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-1">
                      <Clock size={11}/>
                      {new Date(order.created_at).toLocaleString("ar-YE", { hour:"2-digit", minute:"2-digit", day:"numeric", month:"short" })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* === اختيار المندوب === */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[var(--text-1)] flex items-center gap-2">
                <Truck size={16} className="text-brand-700"/>
                المناديب
              </h2>
              {/* فلتر المنطقة */}
              {zones.length > 1 && (
                <select value={filterZone} onChange={e=>setFilterZone(e.target.value)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-2 py-1 text-xs text-[var(--text-2)] outline-none focus:border-brand-500">
                  <option value="">كل المناطق</option>
                  {zones.map(z=><option key={z} value={z}>{z}</option>)}
                </select>
              )}
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pe-1">
              {filteredDrivers.map(d => {
                const load = d.active_shipments / (d.max_orders || 1);
                const isFull = d.active_shipments >= d.max_orders;
                const isSel  = selectedDriver === d.driver_id;
                return (
                  <button key={d.driver_id}
                    onClick={() => !isFull && setSelDriver(d.driver_id)}
                    disabled={isFull}
                    className={`w-full text-right rounded-xl border p-3.5 transition-all ${
                      isSel      ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30" :
                      isFull     ? "border-[var(--border)] opacity-50 cursor-not-allowed" :
                                   "border-[var(--border)] bg-[var(--bg-card)] hover:border-brand-300"
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                          isSel ? "bg-brand-700 text-white" : "bg-brand-50 dark:bg-brand-900/30 text-brand-700"
                        }`}>
                          {d.full_name?.[0] ?? "م"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-1)]">{d.full_name}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{d.coverage_zone}</p>
                        </div>
                      </div>
                      <div className="text-end">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                          isFull ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                          d.status === "available" ? "bg-green-100 text-green-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {isFull ? "ممتلئ" : d.status === "available" ? "متاح" : "مشغول"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1.5">
                      <span>{d.active_shipments} / {d.max_orders} طلبات</span>
                      <span dir="ltr">{d.phone}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--border)]">
                      <div className={`h-1.5 rounded-full transition-all ${
                        load >= 1 ? "bg-red-500" : load >= 0.7 ? "bg-amber-500" : "bg-green-500"
                      }`} style={{ width:`${Math.min(load*100,100)}%` }}/>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* معاينة المندوب المختار */}
            {driver && (
              <div className="rounded-xl border border-brand-200 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/20 p-4 space-y-2">
                <p className="text-sm font-semibold text-brand-700 dark:text-accent-400">
                  سيُسنَد إلى: {driver.full_name}
                </p>
                <div className="h-1.5 w-full rounded-full bg-brand-200 dark:bg-brand-800">
                  <div className={`h-1.5 rounded-full ${
                    driverLoad >= 0.8 ? "bg-red-500" : driverLoad >= 0.5 ? "bg-amber-500" : "bg-green-500"
                  }`} style={{ width:`${Math.min(driverLoad*100,100)}%` }}/>
                </div>
                <p className="text-xs text-brand-600 dark:text-brand-300">
                  الحمل: {driver.active_shipments}/{driver.max_orders} ·
                  المنطقة: {driver.coverage_zone}
                </p>
              </div>
            )}

            {/* زر الإسناد */}
            <button
              onClick={handleAssign}
              disabled={assigning || selectedOrders.size === 0 || !selectedDriver}
              className="btn-primary w-full justify-center py-3 text-base disabled:opacity-50">
              {assigning
                ? <><Loader2 size={16} className="animate-spin"/> جارٍ الإسناد...</>
                : selectedOrders.size === 0 || !selectedDriver
                  ? "اختر طلبات ومندوباً للإسناد"
                  : <>إسناد {selectedOrders.size} طلب{selectedOrders.size > 1 ? "ات" : ""} لـ {driver?.full_name}</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AssignPage() {
  return (
    <Suspense fallback={<div className="skeleton h-96 w-full rounded-xl"/>}>
      <AssignContent/>
    </Suspense>
  );
}
