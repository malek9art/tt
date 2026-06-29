"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { ArrowRight, MapPin, Phone, Package, Truck, CheckCircle, Camera, Loader2 } from "lucide-react";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STATUSES: { key:string; label:string; next:string|null; icon:React.ElementType; color:string }[] = [
  { key:"assigned",  label:"مُسنَد إليك",   next:"picked_up", icon:Package, color:"bg-amber-500" },
  { key:"picked_up", label:"تم الاستلام",   next:"delivered", icon:Truck,   color:"bg-blue-500" },
  { key:"delivered", label:"تم التوصيل",    next:null,        icon:CheckCircle, color:"bg-green-500" },
];

interface ShipmentDetail {
  id: string; status: string; tracking_number:string|null;
  carrier_notes:string|null; proof_photo_url:string|null;
  orders: {
    order_number: string;
    total_amount: number; currency: string;
    address_snapshot: { full_name?:string; phone?:string; governorate?:string; district?:string; street?:string; landmark?:string };
    order_items: { name_snapshot:string; quantity:number }[];
  } | null;
}

export default function DriverOrderDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();
  const [shipment, setShipment] = useState<ShipmentDetail|null>(null);
  const [loading,  setLoading]  = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notes,    setNotes]    = useState("");
  const [uploading,setUploading]= useState(false);
  const [photoUrl, setPhotoUrl] = useState<string|null>(null);

  useEffect(() => {
    sb.from("shipments")
      .select(`
        id, status, tracking_number, carrier_notes, proof_photo_url,
        orders(
          order_number, total_amount, currency,
          address_snapshot,
          order_items(name_snapshot, quantity)
        )
      `)
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setShipment(data as ShipmentDetail);
        setNotes(data?.carrier_notes ?? "");
        setPhotoUrl(data?.proof_photo_url ?? null);
        setLoading(false);
      });
  }, [id]);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    const update: Record<string,unknown> = { status: newStatus, carrier_notes: notes || null };
    if (newStatus === "picked_up") update.picked_up_at = new Date().toISOString();
    if (newStatus === "delivered") {
      update.delivered_at    = new Date().toISOString();
      update.proof_photo_url = photoUrl;
      // تحديث حالة الطلب
      if (shipment?.orders) {
        await sb.from("orders")
          .update({ status:"delivered" })
          .eq("order_number", shipment.orders.order_number);
      }
    }
    await sb.from("shipments").update(update).eq("id", id);
    setShipment(s => s ? { ...s, status: newStatus } : s);
    setUpdating(false);
    if (newStatus === "delivered") router.replace("/driver");
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `deliveries/${id}/${Date.now()}.jpg`;
    const { error } = await sb.storage.from("private").upload(path, file, { upsert: true });
    if (!error) {
      const url = sb.storage.from("private").getPublicUrl(path).data.publicUrl;
      setPhotoUrl(url);
    }
    setUploading(false);
  };

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i=><div key={i} className="skeleton h-24 rounded-xl"/>)}
    </div>
  );
  if (!shipment) return <div className="text-center py-10 text-[var(--text-muted)]">الشحنة غير موجودة</div>;

  const o        = shipment.orders;
  const addr     = o?.address_snapshot;
  const stepObj  = STATUSES.find(s => s.key === shipment.status);
  const nextStep = STATUSES.find(s => s.key === stepObj?.next);

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-[var(--text-2)] hover:text-brand-700 transition-colors">
        <ArrowRight size={16}/> رجوع
      </button>

      {/* رقم الطلب والحالة */}
      <div className="card-base p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="font-bold text-[var(--text-1)] text-lg" dir="ltr">{o?.order_number}</p>
          <span className={`badge px-3 py-1 text-sm text-white ${stepObj?.color ?? "bg-gray-500"}`}>
            {stepObj?.label}
          </span>
        </div>
        {shipment.tracking_number && (
          <p className="text-xs text-[var(--text-muted)]" dir="ltr">رقم التتبع: {shipment.tracking_number}</p>
        )}
      </div>

      {/* عنوان العميل */}
      <div className="card-base p-5 space-y-3">
        <h2 className="font-semibold text-[var(--text-1)] flex items-center gap-2">
          <MapPin size={16} className="text-brand-700"/> عنوان التوصيل
        </h2>
        <div className="space-y-1">
          <p className="font-medium text-[var(--text-1)]">{addr?.full_name}</p>
          <a href={`tel:${addr?.phone}`}
            className="flex items-center gap-2 text-brand-700 dark:text-accent-400 font-medium hover:underline">
            <Phone size={14}/> {addr?.phone}
          </a>
          <p className="text-sm text-[var(--text-2)]">
            {addr?.governorate}{addr?.district ? ` · ${addr.district}` : ""}
          </p>
          {addr?.street   && <p className="text-sm text-[var(--text-2)]">{addr.street}</p>}
          {addr?.landmark && <p className="text-xs text-[var(--text-muted)]">📍 {addr.landmark}</p>}
        </div>
      </div>

      {/* المنتجات */}
      <div className="card-base overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border)] font-semibold text-[var(--text-1)]">
          محتويات الطلب
        </div>
        <div className="divide-y divide-[var(--border)]">
          {o?.order_items?.map((item, i) => (
            <div key={i} className="flex justify-between px-5 py-3 text-sm">
              <span className="text-[var(--text-1)]">{item.name_snapshot}</span>
              <span className="text-[var(--text-muted)] font-medium">× {item.quantity}</span>
            </div>
          ))}
          <div className="flex justify-between px-5 py-3 bg-[var(--bg-page)]">
            <span className="font-bold text-[var(--text-1)]">الإجمالي</span>
            <span className="font-bold text-brand-700 dark:text-accent-400">
              {new Intl.NumberFormat("ar-YE").format(o?.total_amount ?? 0)} ﷼
            </span>
          </div>
        </div>
      </div>

      {/* ملاحظات المندوب */}
      {shipment.status !== "delivered" && (
        <div className="card-base p-5 space-y-3">
          <h2 className="font-semibold text-[var(--text-1)]">ملاحظات</h2>
          <textarea
            rows={3} value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="أضف ملاحظات عن التوصيل..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors resize-none"
          />
        </div>
      )}

      {/* رفع صورة الاستلام */}
      {shipment.status === "picked_up" && (
        <div className="card-base p-5 space-y-3">
          <h2 className="font-semibold text-[var(--text-1)] flex items-center gap-2">
            <Camera size={16} className="text-brand-700"/> صورة التوصيل (اختياري)
          </h2>
          {photoUrl ? (
            <div className="relative">
              <img src={photoUrl} alt="صورة التوصيل" className="w-full rounded-lg object-cover max-h-48"/>
              <button onClick={() => setPhotoUrl(null)}
                className="absolute top-2 end-2 rounded-full bg-red-500 text-white p-1 text-xs">✕</button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] p-6 cursor-pointer hover:border-brand-400 transition-colors">
              {uploading ? <Loader2 size={24} className="animate-spin text-brand-600"/> : <Camera size={28} className="text-[var(--text-muted)]"/>}
              <span className="text-sm text-[var(--text-muted)]">{uploading ? "جارٍ الرفع..." : "التقط صورة أو اختر من المعرض"}</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} disabled={uploading}/>
            </label>
          )}
        </div>
      )}

      {/* زر تحديث الحالة */}
      {nextStep && shipment.status !== "delivered" && (
        <button onClick={() => updateStatus(nextStep.key)} disabled={updating}
          className={`w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60 shadow-lg ${nextStep.color ?? "bg-brand-700"}`}>
          {updating
            ? <><Loader2 size={18} className="animate-spin"/> جارٍ التحديث...</>
            : <><nextStep.icon size={18}/> {nextStep.label}</>}
        </button>
      )}

      {shipment.status === "delivered" && (
        <div className="card-base p-5 text-center">
          <CheckCircle size={40} className="mx-auto mb-2 text-green-500"/>
          <p className="font-bold text-[var(--text-1)]">تم توصيل هذا الطلب</p>
        </div>
      )}
    </div>
  );
}
