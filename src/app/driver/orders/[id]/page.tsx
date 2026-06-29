"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import {
  ArrowRight, MapPin, Phone, Package, CheckCircle,
  Camera, Loader2, MessageSquare
} from "lucide-react";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const NEXT_ACTION: Record<string,{next:string;label:string;color:string}> = {
  assigned:         { next:"picked_up",        label:"تأكيد استلام الطلب",  color:"bg-blue-500"  },
  picked_up:        { next:"out_for_delivery", label:"بدء التوصيل",          color:"bg-amber-500" },
  out_for_delivery: { next:"delivered",        label:"تأكيد التوصيل ✓",      color:"bg-green-600" },
};

const STATUS_AR: Record<string,string> = {
  pending:"معلّق", assigned:"مسنَد", picked_up:"تم الاستلام",
  out_for_delivery:"في الطريق", delivered:"تم التوصيل",
  failed:"فشل", returned:"مُرتجَع",
};

interface OrderData {
  id: string; order_number: string; total_amount: number; currency: string;
  address_snapshot: { full_name:string; phone:string; governorate:string; district:string|null; street:string|null; landmark:string|null; };
  order_items: { name_snapshot:string; quantity:number }[];
}

interface ShipmentRow {
  id: string; tracking_number: string; status: string;
  carrier_notes: string | null; proof_photo_url: string | null;
  picked_up_at: string | null; delivered_at: string | null;
  orders: OrderData | OrderData[] | null;
}

function getOrder(s: ShipmentRow): OrderData | null {
  if (!s.orders) return null;
  return Array.isArray(s.orders) ? s.orders[0] ?? null : s.orders;
}

export default function DriverOrderDetail() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const [ship,     setShip]     = useState<ShipmentRow|null>(null);
  const [loading,  setLoading]  = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notes,    setNotes]    = useState("");
  const [photoUrl, setPhotoUrl] = useState<string|null>(null);
  const [uploading,setUploading]= useState(false);
  const [success,  setSuccess]  = useState(false);
  const [userId,   setUserId]   = useState<string|null>(null);

  useEffect(() => {
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace("/driver/login"); return; }
      setUserId(user.id);
    });

    sb.from("shipments")
      .select(`
        id, tracking_number, status, carrier_notes,
        proof_photo_url, picked_up_at, delivered_at,
        orders(
          id, order_number, total_amount, currency, address_snapshot,
          order_items(name_snapshot, quantity)
        )
      `)
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) {
          const row = data as unknown as ShipmentRow;
          setShip(row);
          setNotes(row.carrier_notes ?? "");
          setPhotoUrl(row.proof_photo_url ?? null);
        }
        setLoading(false);
      });
  }, [id, router]);

  const updateStatus = async () => {
    if (!ship || !userId) return;
    const action = NEXT_ACTION[ship.status];
    if (!action) return;

    setUpdating(true);
    const now = new Date().toISOString();
    const updates: Record<string,unknown> = {
      status: action.next,
      carrier_notes: notes || null,
    };
    if (action.next === "picked_up")   updates.picked_up_at = now;
    if (action.next === "delivered")   updates.delivered_at = now;
    if (photoUrl) updates.proof_photo_url = photoUrl;

    await sb.from("shipments").update(updates).eq("id", ship.id);

    const order = getOrder(ship);
    if (order?.id) {
      const orderStatus =
        action.next === "out_for_delivery" ? "out_for_delivery"
        : action.next === "delivered"       ? "delivered"
        : "processing";
      await sb.from("orders").update({ status: orderStatus }).eq("id", order.id);
    }

    setShip(prev => prev ? { ...prev, status: action.next } : prev);
    setSuccess(true); setUpdating(false);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    const ext  = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${ship?.id ?? id}-proof.${ext}`;
    const { data, error } = await sb.storage.from("private")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (!error && data) {
      const { data: { publicUrl } } = sb.storage.from("private").getPublicUrl(path);
      setPhotoUrl(publicUrl);
    }
    setUploading(false);
  };

  const reportFailed = async () => {
    if (!confirm("هل تريد الإبلاغ عن فشل التوصيل؟")) return;
    await sb.from("shipments")
      .update({ status:"failed", carrier_notes: notes || "فشل التوصيل" })
      .eq("id", id);
    router.replace("/driver");
  };

  if (loading) return (
    <div className="min-h-screen bg-[var(--bg-page)] p-4 space-y-3" dir="rtl">
      {[1,2,3].map(i=><div key={i} className="skeleton h-24 w-full rounded-xl"/>)}
    </div>
  );

  if (!ship) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)]" dir="rtl">
      <div className="text-center">
        <p className="text-[var(--text-muted)]">الشحنة غير موجودة</p>
        <Link href="/driver" className="btn-primary mt-4 inline-flex">← العودة</Link>
      </div>
    </div>
  );

  const order  = getOrder(ship);
  const addr   = order?.address_snapshot;
  const action = NEXT_ACTION[ship.status];
  const isDone = ["delivered","failed","returned"].includes(ship.status);

  return (
    <div className="min-h-screen bg-[var(--bg-page)]" dir="rtl">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-card)] px-4">
        <Link href="/driver" className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-2)] hover:bg-[var(--border)] transition-colors">
          <ArrowRight size={18}/>
        </Link>
        <div className="flex-1">
          <p className="font-bold text-[var(--text-1)]" dir="ltr">#{order?.order_number}</p>
          <p className="text-xs text-[var(--text-muted)]">{STATUS_AR[ship.status] ?? ship.status}</p>
        </div>
        {isDone && <CheckCircle size={20} className={ship.status==="delivered" ? "text-green-500" : "text-red-400"}/>}
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {success && (
          <div className="rounded-xl bg-green-50 dark:bg-green-900/30 border border-green-200 p-3 flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle size={18}/>
            <span className="text-sm font-medium">تم تحديث الحالة بنجاح</span>
          </div>
        )}

        {addr && (
          <div className="card-base p-4 space-y-3">
            <h2 className="font-semibold text-[var(--text-1)] flex items-center gap-2">
              <MapPin size={16} className="text-brand-700"/> عنوان التوصيل
            </h2>
            <p className="font-bold text-[var(--text-1)] text-lg">{addr.full_name}</p>
            <div className="space-y-1.5 text-sm text-[var(--text-2)]">
              <p className="flex items-center gap-2">
                <MapPin size={13} className="shrink-0 text-brand-700"/>
                {addr.governorate}{addr.district && ` · ${addr.district}`}
                {addr.street && ` · ${addr.street}`}
              </p>
              {addr.landmark && <p className="text-xs text-[var(--text-muted)]">علامة: {addr.landmark}</p>}
            </div>
            <div className="flex gap-2 pt-1">
              <a href={`tel:${addr.phone}`}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-700 py-3 text-sm font-bold text-white hover:bg-brand-800 transition-colors">
                <Phone size={16}/> <span dir="ltr">{addr.phone}</span>
              </a>
              <a href={`https://wa.me/${addr.phone.replace(/[^0-9]/g,"")}`} target="_blank" rel="noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors">
                <MessageSquare size={18}/>
              </a>
            </div>
          </div>
        )}

        <div className="card-base p-4">
          <h2 className="font-semibold text-[var(--text-1)] flex items-center gap-2 mb-3">
            <Package size={16} className="text-brand-700"/> محتوى الطلب
          </h2>
          <div className="space-y-2">
            {(order?.order_items ?? []).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-1)]">{item.name_snapshot}</span>
                <span className="text-[var(--text-muted)]">× {item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--text-1)]">المبلغ عند التوصيل</span>
            <span className="text-lg font-bold text-brand-700 dark:text-accent-400">
              {new Intl.NumberFormat("ar-YE").format(order?.total_amount ?? 0)} ﷼
            </span>
          </div>
        </div>

        {!isDone && (
          <div className="card-base p-4">
            <label className="mb-2 block text-sm font-medium text-[var(--text-2)]">ملاحظات</label>
            <textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)}
              placeholder="أضف أي ملاحظة..."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 resize-none"/>
          </div>
        )}

        {ship.status === "out_for_delivery" && (
          <div className="card-base p-4">
            <h2 className="font-semibold text-[var(--text-1)] mb-3 flex items-center gap-2">
              <Camera size={16} className="text-brand-700"/> صورة إثبات التوصيل
            </h2>
            {photoUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-green-200">
                <img src={photoUrl} alt="إثبات التوصيل" className="w-full h-48 object-cover"/>
                <div className="absolute top-2 end-2 rounded-full bg-green-500 p-1">
                  <CheckCircle size={16} className="text-white"/>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] p-8 cursor-pointer hover:border-brand-400 transition-colors">
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload}/>
                {uploading
                  ? <><Loader2 size={24} className="animate-spin text-brand-600"/><p className="text-sm text-[var(--text-muted)]">جارٍ الرفع...</p></>
                  : <><Camera size={28} className="text-brand-700"/><p className="text-sm font-medium text-[var(--text-1)]">التقط صورة الإيصال</p></>}
              </label>
            )}
          </div>
        )}

        {!isDone && action && (
          <div className="space-y-3">
            <button onClick={updateStatus} disabled={updating}
              className={`w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60 shadow-lg ${action.color}`}>
              {updating ? <><Loader2 size={18} className="animate-spin"/> جارٍ التحديث...</> : action.label}
            </button>
            {ship.status === "out_for_delivery" && (
              <button onClick={reportFailed}
                className="w-full rounded-2xl border border-red-300 py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                الإبلاغ عن فشل التوصيل
              </button>
            )}
          </div>
        )}

        {isDone && (
          <div className={`card-base p-5 text-center ${
            ship.status==="delivered"
              ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
              : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
          }`}>
            <CheckCircle size={40} className={`mx-auto mb-2 ${ship.status==="delivered" ? "text-green-500" : "text-red-400"}`}/>
            <p className={`font-bold ${ship.status==="delivered" ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {ship.status==="delivered" ? "تم التوصيل بنجاح" : "فشل التوصيل"}
            </p>
            {ship.delivered_at && (
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {new Date(ship.delivered_at).toLocaleString("ar-YE")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
