"use client";
import { useEffect, useState } from "react";
import { useParams }           from "next/navigation";
import Link                    from "next/link";
import { ArrowRight, Loader2, CheckCircle } from "lucide-react";

const ORDER_STATUSES = [
  "pending","confirmed","processing",
  "ready_for_delivery","out_for_delivery",
  "delivered","completed","cancelled",
];
const STATUS_AR: Record<string,string> = {
  pending:"معلّق", confirmed:"مؤكد", processing:"قيد التجهيز",
  ready_for_delivery:"جاهز للتسليم", out_for_delivery:"في الطريق",
  delivered:"تم التوصيل", completed:"مكتمل", cancelled:"ملغي",
};

export default function AdminOrderDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const [order,   setOrder]   = useState<Record<string,unknown>|null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [saved,   setSaved]   = useState(false);

  useEffect(()=>{
    fetch(`/api/admin/orders/${id}`)
      .then(r=>r.json())
      .then(d=>{ setOrder(d); setNewStatus(d.status); setLoading(false); });
  },[id]);

  const handleUpdateStatus = async () => {
    setSaving(true); setSaved(false);
    await fetch(`/api/admin/orders/${id}`,{
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ status: newStatus }),
    });
    setOrder(o => o ? {...o, status:newStatus} : o);
    setSaving(false); setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  };

  if (loading) return (
    <div className="space-y-4 max-w-2xl">
      {[1,2,3].map(i=><div key={i} className="skeleton h-28 w-full"/>)}
    </div>
  );

  if (!order) return (
    <div className="text-center py-20">
      <p className="text-[var(--text-muted)]">الطلب غير موجود</p>
      <Link href="/admin/orders" className="btn-primary mt-4 inline-flex">← العودة</Link>
    </div>
  );

  const items   = order.order_items as {name_snapshot:string;quantity:number;price:number;subtotal:number}[] ?? [];
  const profile = order.profiles   as {full_name:string;phone:string}|null;
  const addr    = order.address_snapshot as Record<string,string> ?? {};

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/orders" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-2)] hover:border-brand-300 transition-colors">
          <ArrowRight size={16}/>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]" dir="ltr">{order.order_number as string}</h1>
          <p className="text-xs text-[var(--text-muted)]">تفاصيل الطلب</p>
        </div>
      </div>

      {/* تحديث الحالة */}
      <div className="card-base p-5">
        <h2 className="font-semibold text-[var(--text-1)] mb-3">تحديث حالة الطلب</h2>
        <div className="flex gap-2 flex-wrap">
          <select value={newStatus} onChange={e=>setNewStatus(e.target.value)}
            className="flex-1 min-w-40 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors">
            {ORDER_STATUSES.map(s=>(
              <option key={s} value={s}>{STATUS_AR[s]??s}</option>
            ))}
          </select>
          <button onClick={handleUpdateStatus} disabled={saving||newStatus===order.status}
            className="btn-primary gap-2 whitespace-nowrap">
            {saving ? <><Loader2 size={14} className="animate-spin"/> جارٍ...</>
              : saved ? <><CheckCircle size={14}/> تم الحفظ</>
              : "تحديث الحالة"}
          </button>
        </div>
      </div>

      {/* المنتجات */}
      <div className="card-base overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-3">
          <h2 className="font-semibold text-[var(--text-1)]">المنتجات</h2>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {items.map((item,i)=>(
            <div key={i} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--text-1)]">{item.name_snapshot}</p>
                <p className="text-xs text-[var(--text-muted)]">الكمية: {item.quantity} × {new Intl.NumberFormat("ar-YE").format(item.price)} ﷼</p>
              </div>
              <span className="font-bold text-sm text-brand-700 dark:text-accent-400">
                {new Intl.NumberFormat("ar-YE").format(item.subtotal)} ﷼
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between px-5 py-3 bg-[var(--bg-page)]">
            <span className="font-bold text-[var(--text-1)]">الإجمالي</span>
            <span className="text-lg font-bold text-brand-700 dark:text-accent-400">
              {new Intl.NumberFormat("ar-YE").format(order.total_amount as number)} ﷼
            </span>
          </div>
        </div>
      </div>

      {/* بيانات العميل والعنوان */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="card-base p-5">
          <h2 className="font-semibold text-[var(--text-1)] mb-3">بيانات العميل</h2>
          <p className="text-sm text-[var(--text-2)]">{profile?.full_name??"—"}</p>
          <p className="text-sm text-[var(--text-2)]" dir="ltr">{profile?.phone??""}</p>
        </div>
        <div className="card-base p-5">
          <h2 className="font-semibold text-[var(--text-1)] mb-3">عنوان التوصيل</h2>
          <p className="text-sm text-[var(--text-2)]">{addr.full_name} · {addr.phone}</p>
          <p className="text-sm text-[var(--text-2)]">{addr.governorate}{addr.district&&` · ${addr.district}`}</p>
          {addr.street&&<p className="text-sm text-[var(--text-2)]">{addr.street}</p>}
        </div>
      </div>
    </div>
  );
}
