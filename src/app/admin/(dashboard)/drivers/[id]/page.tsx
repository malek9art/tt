"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import {
  ArrowRight, Star, Truck, Phone, Mail, MapPin,
  Package, CheckCircle, XCircle, Clock,
  Save, Loader2, ToggleLeft, ToggleRight, Trash2
} from "lucide-react";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STATUS_STYLE: Record<string,{label:string;color:string}> = {
  assigned:         { label:"مُسنَد",       color:"bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  picked_up:        { label:"تم الاستلام",  color:"bg-indigo-100 text-indigo-700" },
  out_for_delivery: { label:"في الطريق",   color:"bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  delivered:        { label:"تم التوصيل",  color:"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  failed:           { label:"فشل",          color:"bg-red-100 text-red-700" },
  returned:         { label:"مُرتجَع",      color:"bg-purple-100 text-purple-700" },
  pending:          { label:"معلّق",        color:"bg-gray-100 text-gray-600" },
};

const VEHICLES = [
  { value:"motorcycle",label:"دراجة نارية 🏍️" },
  { value:"car",       label:"سيارة 🚗" },
  { value:"bicycle",   label:"دراجة هوائية 🚲" },
  { value:"walking",   label:"مشياً 🚶" },
];

const GOVS = [
  "أمانة العاصمة","صنعاء","عدن","تعز","الحديدة","إب",
  "ذمار","حضرموت","شبوة","مأرب","حجة","صعدة","عمران","لحج",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export default function DriverDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const [driver,     setDriver]     = useState<Row|null>(null);
  const [shipments,  setShipments]  = useState<Row[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [form, setForm] = useState({
    vehicle_type:"motorcycle", coverage_zone:"تعز",
    max_orders:5, phone:"", notes:"", is_active:true,
  });

  useEffect(() => {
    Promise.all([
      // بيانات المندوب
      sb.from("drivers").select("*, profiles(full_name,phone,avatar_url), auth_users:id(email)").eq("id", id).single()
        .then(({data}) => {
          if (data) {
            setDriver(data);
            setForm({
              vehicle_type:  String(data.vehicle_type  ?? "motorcycle"),
              coverage_zone: String(data.coverage_zone ?? "تعز"),
              max_orders:    Number(data.max_orders     ?? 5),
              phone:         String(data.phone          ?? ""),
              notes:         String(data.notes          ?? ""),
              is_active:     Boolean(data.is_active     ?? true),
            });
          }
        }),
      // شحناته
      sb.from("shipments")
        .select("id, tracking_number, status, assigned_at, delivered_at, orders(order_number, total_amount)")
        .eq("driver_id", id)
        .order("assigned_at", { ascending: false })
        .limit(20),
    ]).then(([, shipsRes]) => {
      setShipments((shipsRes.data as Row[]) ?? []);
      setLoading(false);
    });
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/admin/drivers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    setSaving(false);
  };

  const handleDeactivate = async () => {
    if (!confirm("هل تريد تعطيل حساب هذا المندوب؟")) return;
    await fetch(`/api/admin/drivers/${id}`, { method: "DELETE" });
    router.replace("/admin/drivers");
  };

  const unassign = async (shipment_id: string) => {
    await fetch("/api/admin/drivers/unassign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shipment_id }),
    });
    setShipments(prev => prev.map(s =>
      s.id === shipment_id ? { ...s, status: "pending", driver_id: null } : s
    ));
  };

  const active = shipments.filter(s => ["assigned","picked_up","out_for_delivery"].includes(String(s.status)));
  const done   = shipments.filter(s => ["delivered","failed","returned"].includes(String(s.status)));

  const iCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  if (loading) return (
    <div className="space-y-4 max-w-4xl">
      {[1,2,3].map(i=><div key={i} className="skeleton h-32 w-full rounded-xl"/>)}
    </div>
  );

  if (!driver) return (
    <div className="text-center py-20">
      <p className="text-[var(--text-muted)]">المندوب غير موجود</p>
      <Link href="/admin/drivers" className="btn-primary mt-4 inline-flex">← العودة</Link>
    </div>
  );

  const profile  = driver.profiles as Row | null;
  const fullName = profile?.full_name ?? "—";
  const email    = (driver as Row)["email"] ?? "";
  const rate     = driver.total_deliveries > 0
    ? Math.round(done.filter(s => s.status === "delivered").length / Math.max(shipments.length,1) * 100)
    : 0;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/drivers" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-2)] hover:border-brand-300 transition-colors">
            <ArrowRight size={16}/>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-700 text-white text-xl font-bold">
              {fullName[0] ?? "م"}
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-1)]">{fullName}</h1>
              <p className="text-xs text-[var(--text-muted)]">مندوب توصيل</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDeactivate}
            className="btn-ghost border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 gap-1.5 text-sm">
            <Trash2 size={14}/> تعطيل الحساب
          </button>
        </div>
      </div>

      {/* بطاقات الإحصاء السريع */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label:"نشطة الآن",   value:active.length,           icon:Package,     color:"text-amber-600" },
          { label:"إجمالي",      value:driver.total_deliveries, icon:Truck,       color:"text-blue-600" },
          { label:"هذا الشهر",   value:shipments.filter(s => new Date(String(s.assigned_at)).getMonth() === new Date().getMonth()).length, icon:Clock, color:"text-indigo-600" },
          { label:"معدل الإنجاز",value:`${rate}%`,              icon:CheckCircle, color:"text-green-600" },
        ].map(({ label, value, icon:Icon, color }) => (
          <div key={label} className="card-base p-4 text-center">
            <Icon size={18} className={`mx-auto mb-1.5 ${color}`}/>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-[var(--text-muted)]">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* === التعديلات === */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card-base p-5 space-y-4">
            <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3">معلومات التواصل</h2>

            {/* معلومات ثابتة */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-[var(--text-2)]">
                <Mail size={14} className="text-brand-700 shrink-0"/>
                <span dir="ltr" className="truncate">{String(email)}</span>
              </div>
              {profile?.phone && (
                <a href={`tel:${String(profile.phone)}`}
                  className="flex items-center gap-2 text-[var(--text-2)] hover:text-brand-700 transition-colors">
                  <Phone size={14} className="text-brand-700 shrink-0"/>
                  <span dir="ltr">{String(profile.phone)}</span>
                </a>
              )}
            </div>

            {/* الحالة */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-2)]">حالة الحساب</span>
              <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                className="flex items-center gap-1 text-sm">
                {form.is_active
                  ? <><ToggleRight size={22} className="text-green-500"/> <span className="text-green-600">نشط</span></>
                  : <><ToggleLeft  size={22} className="text-gray-400"/>  <span className="text-[var(--text-muted)]">معطّل</span></>}
              </button>
            </div>
          </div>

          <div className="card-base p-5 space-y-4">
            <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3">إعدادات التوصيل</h2>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">رقم الهاتف</label>
              <input type="tel" dir="ltr" value={form.phone}
                onChange={e=>setForm(f=>({...f,phone:e.target.value}))} className={iCls}/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">وسيلة التوصيل</label>
              <select value={form.vehicle_type} onChange={e=>setForm(f=>({...f,vehicle_type:e.target.value}))} className={iCls}>
                {VEHICLES.map(v=><option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">منطقة التغطية</label>
              <select value={form.coverage_zone} onChange={e=>setForm(f=>({...f,coverage_zone:e.target.value}))} className={iCls}>
                {GOVS.map(g=><option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">
                الحد الأقصى للطلبات المتزامنة
              </label>
              <input type="number" min="1" max="20" dir="ltr" value={form.max_orders}
                onChange={e=>setForm(f=>({...f,max_orders:Number(e.target.value)}))} className={iCls}/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">ملاحظات</label>
              <textarea rows={3} value={form.notes}
                onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                className={iCls+" resize-none"}/>
            </div>
            <button onClick={handleSave} disabled={saving}
              className={`w-full justify-center ${saved?"btn-ghost border border-green-400 text-green-600":"btn-primary"}`}>
              {saving ? <><Loader2 size={14} className="animate-spin"/> حفظ...</>
               : saved ? <><CheckCircle size={14}/> تم الحفظ</>
               :         <><Save size={14}/> حفظ التعديلات</>}
            </button>
          </div>

          {/* التقييم */}
          {driver.rating && (
            <div className="card-base p-5">
              <h2 className="font-semibold text-[var(--text-1)] mb-3">التقييم</h2>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1,2,3,4,5].map(s=>(
                    <Star key={s} size={18}
                      className={s <= Math.round(Number(driver.rating))
                        ? "fill-accent-500 text-accent-500"
                        : "text-[var(--border)]"}/>
                  ))}
                </div>
                <span className="text-lg font-bold text-[var(--text-1)]">
                  {Number(driver.rating).toFixed(1)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* === سجل الشحنات === */}
        <div className="lg:col-span-2 space-y-4">
          {/* الشحنات النشطة */}
          {active.length > 0 && (
            <div className="card-base overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                <h2 className="font-semibold text-[var(--text-1)]">
                  الشحنات النشطة ({active.length})
                </h2>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {active.map(s => {
                  const ord = Array.isArray(s.orders) ? s.orders[0] : s.orders;
                  const st  = STATUS_STYLE[String(s.status)] ?? { label:String(s.status), color:"bg-gray-100 text-gray-600" };
                  return (
                    <div key={String(s.id)} className="flex items-center justify-between px-5 py-3.5">
                      <div>
                        <p className="font-medium text-sm text-[var(--text-1)]" dir="ltr">
                          #{String(ord?.order_number ?? "—")}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {s.assigned_at ? new Date(String(s.assigned_at)).toLocaleString("ar-YE",{hour:"2-digit",minute:"2-digit",day:"numeric",month:"short"}) : "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`badge text-xs px-2.5 py-1 ${st.color}`}>{st.label}</span>
                        <button onClick={() => unassign(String(s.id))}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors flex items-center gap-1">
                          <XCircle size={13}/> إلغاء
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* سجل الشحنات */}
          <div className="card-base overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <h2 className="font-semibold text-[var(--text-1)]">
                سجل الشحنات ({shipments.length})
              </h2>
            </div>
            {shipments.length === 0 ? (
              <div className="py-12 text-center text-[var(--text-muted)]">
                <Truck size={32} className="mx-auto mb-2 opacity-20"/>
                لا توجد شحنات بعد
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-page)] border-b border-[var(--border)]">
                    <tr>
                      {["رقم الطلب","الحالة","المبلغ","تاريخ الإسناد","التوصيل"].map(h=>(
                        <th key={h} className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {shipments.map(s => {
                      const ord = Array.isArray(s.orders) ? s.orders[0] : s.orders;
                      const st  = STATUS_STYLE[String(s.status)] ?? { label:String(s.status), color:"bg-gray-100 text-gray-600" };
                      return (
                        <tr key={String(s.id)} className="hover:bg-[var(--bg-page)] transition-colors">
                          <td className="px-4 py-3 font-medium text-[var(--text-1)]" dir="ltr">
                            #{String(ord?.order_number ?? "—")}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge text-xs px-2 py-0.5 ${st.color}`}>{st.label}</span>
                          </td>
                          <td className="px-4 py-3 text-brand-700 dark:text-accent-400 font-semibold whitespace-nowrap">
                            {ord?.total_amount ? new Intl.NumberFormat("ar-YE").format(Number(ord.total_amount)) + " ﷼" : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                            {s.assigned_at ? new Date(String(s.assigned_at)).toLocaleDateString("ar-YE") : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                            {s.delivered_at
                              ? <span className="text-green-600 flex items-center gap-1">
                                  <CheckCircle size={12}/>
                                  {new Date(String(s.delivered_at)).toLocaleDateString("ar-YE")}
                                </span>
                              : "—"}
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
      </div>
    </div>
  );
}
