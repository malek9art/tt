"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Truck, Plus, Star, CheckCircle, XCircle,
  Clock, Package, TrendingUp, Phone, Mail,
  ToggleLeft, ToggleRight, Settings, Eye
} from "lucide-react";

interface Driver {
  driver_id:          string;
  full_name:          string;
  email:              string;
  phone:              string;
  vehicle_type:       string;
  coverage_zone:      string;
  status:             string;
  is_active:          boolean;
  max_orders:         number;
  active_shipments:   number;
  total_deliveries:   number;
  monthly_deliveries: number;
  completion_rate:    number;
  rating:             number | null;
  joined_at:          string;
  last_active_at:     string | null;
}

const STATUS_STYLE: Record<string,{label:string;dot:string}> = {
  available: { label:"متاح",       dot:"bg-green-500"  },
  busy:      { label:"مشغول",      dot:"bg-amber-500"  },
  offline:   { label:"غير متصل",  dot:"bg-gray-400"   },
};

const VEHICLE_AR: Record<string,string> = {
  motorcycle:"دراجة نارية", car:"سيارة",
  bicycle:"دراجة هوائية", walking:"مشياً",
};

export default function DriversPage() {
  const [drivers,  setDrivers]  = useState<Driver[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<"all"|"active"|"inactive">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/drivers");
    const d = await r.json();
    setDrivers(Array.isArray(d) ? d : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (id: string, current: boolean) => {
    await fetch(`/api/admin/drivers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
    setDrivers(prev => prev.map(d => d.driver_id === id ? { ...d, is_active: !current } : d));
  };

  const filtered = drivers.filter(d =>
    filter === "all" ? true :
    filter === "active" ? d.is_active :
    !d.is_active
  );

  const stats = {
    total:    drivers.length,
    active:   drivers.filter(d => d.is_active).length,
    online:   drivers.filter(d => d.status !== "offline").length,
    busy:     drivers.filter(d => d.status === "busy").length,
  };

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-1)]">إدارة المناديب</h1>
          <p className="text-sm text-[var(--text-muted)]">{drivers.length} مندوب مسجّل</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/drivers/assign" className="btn-ghost border border-[var(--border)] gap-2 text-sm">
            <Package size={15}/> إسناد طلبات
          </Link>
          <Link href="/admin/drivers/new" className="btn-primary gap-2">
            <Plus size={16}/> إضافة مندوب
          </Link>
        </div>
      </div>

      {/* بطاقات الإحصاء */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label:"إجمالي المناديب", value:stats.total,  icon:Truck,      color:"text-blue-600",  bg:"bg-blue-50 dark:bg-blue-900/20" },
          { label:"نشطون",           value:stats.active, icon:CheckCircle,color:"text-green-600", bg:"bg-green-50 dark:bg-green-900/20" },
          { label:"متصلون الآن",     value:stats.online, icon:Clock,      color:"text-indigo-600",bg:"bg-indigo-50 dark:bg-indigo-900/20" },
          { label:"في التوصيل",      value:stats.busy,   icon:TrendingUp, color:"text-amber-600", bg:"bg-amber-50 dark:bg-amber-900/20" },
        ].map(({ label, value, icon:Icon, color, bg }) => (
          <div key={label} className={`card-base p-4 ${bg}`}>
            <Icon size={20} className={`mb-2 ${color}`}/>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* فلاتر */}
      <div className="flex gap-2">
        {[
          { v:"all",      l:`الكل (${stats.total})`   },
          { v:"active",   l:`نشطون (${stats.active})`  },
          { v:"inactive", l:`معطّلون (${stats.total - stats.active})` },
        ].map(({ v, l }) => (
          <button key={v} onClick={() => setFilter(v as typeof filter)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === v ? "bg-brand-700 text-white" : "border border-[var(--border)] text-[var(--text-2)] hover:border-brand-300"
            }`}>{l}</button>
        ))}
      </div>

      {/* قائمة المناديب */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i=><div key={i} className="skeleton h-48 w-full rounded-xl"/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-base py-16 text-center">
          <Truck size={48} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]"/>
          <p className="font-semibold text-[var(--text-1)]">لا يوجد مناديب</p>
          <Link href="/admin/drivers/new" className="btn-primary mt-4 inline-flex gap-2">
            <Plus size={15}/> أضف أول مندوب
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(driver => {
            const st = STATUS_STYLE[driver.status] ?? { label:driver.status, dot:"bg-gray-400" };
            const load = driver.active_shipments / (driver.max_orders || 1);
            return (
              <div key={driver.driver_id}
                className={`card-base p-5 flex flex-col gap-4 transition-all ${!driver.is_active ? "opacity-60" : ""}`}>

                {/* رأس البطاقة */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-700 text-white text-lg font-bold">
                        {driver.full_name?.[0] ?? "م"}
                      </div>
                      <span className={`absolute -bottom-0.5 -end-0.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--bg-card)] ${st.dot}`}/>
                    </div>
                    <div>
                      <p className="font-bold text-[var(--text-1)]">{driver.full_name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{st.label} · {VEHICLE_AR[driver.vehicle_type] ?? driver.vehicle_type}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive(driver.driver_id, driver.is_active)}
                    title={driver.is_active ? "تعطيل الحساب" : "تفعيل الحساب"}
                    className="text-[var(--text-muted)] hover:text-brand-700 transition-colors">
                    {driver.is_active
                      ? <ToggleRight size={24} className="text-green-500"/>
                      : <ToggleLeft  size={24}/>}
                  </button>
                </div>

                {/* معلومات التواصل */}
                <div className="space-y-1.5 text-xs text-[var(--text-muted)]">
                  {driver.phone && (
                    <a href={`tel:${driver.phone}`}
                      className="flex items-center gap-2 hover:text-brand-700 transition-colors">
                      <Phone size={12}/> <span dir="ltr">{driver.phone}</span>
                    </a>
                  )}
                  <div className="flex items-center gap-2">
                    <Mail size={12}/> <span dir="ltr" className="truncate">{driver.email}</span>
                  </div>
                </div>

                {/* الإحصاءات */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-[var(--bg-page)] p-2">
                    <p className="text-sm font-bold text-[var(--text-1)]">{driver.active_shipments}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">نشطة</p>
                  </div>
                  <div className="rounded-lg bg-[var(--bg-page)] p-2">
                    <p className="text-sm font-bold text-[var(--text-1)]">{driver.monthly_deliveries}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">هذا الشهر</p>
                  </div>
                  <div className="rounded-lg bg-[var(--bg-page)] p-2">
                    <p className="text-sm font-bold text-[var(--text-1)]">{driver.completion_rate}%</p>
                    <p className="text-[10px] text-[var(--text-muted)]">إنجاز</p>
                  </div>
                </div>

                {/* شريط الحمل */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[var(--text-muted)]">الحمل الحالي</span>
                    <span className="text-xs font-medium text-[var(--text-2)]">
                      {driver.active_shipments} / {driver.max_orders}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--border)]">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        load >= 1 ? "bg-red-500" :
                        load >= 0.7 ? "bg-amber-500" : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(load * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* التقييم */}
                {driver.rating && (
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={12}
                        className={s <= Math.round(driver.rating ?? 0)
                          ? "fill-accent-500 text-accent-500"
                          : "text-[var(--border)]"}/>
                    ))}
                    <span className="text-xs text-[var(--text-muted)] ms-1">{driver.rating?.toFixed(1)}</span>
                  </div>
                )}

                {/* منطقة التغطية */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">منطقة: {driver.coverage_zone}</span>
                  <span className="text-[var(--text-muted)]">
                    {driver.total_deliveries} توصيل كلي
                  </span>
                </div>

                {/* أزرار الإجراء */}
                <div className="flex gap-2 pt-1 border-t border-[var(--border)]">
                  <Link href={`/admin/drivers/${driver.driver_id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] py-2 text-xs text-[var(--text-2)] hover:border-brand-300 transition-colors">
                    <Eye size={13}/> التفاصيل
                  </Link>
                  <Link href={`/admin/drivers/assign?driver=${driver.driver_id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-brand-700 py-2 text-xs text-white hover:bg-brand-800 transition-colors">
                    <Package size={13}/> إسناد طلب
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
