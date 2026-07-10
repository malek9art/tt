"use client";
import { useEffect, useState } from "react";
import { useParams }           from "next/navigation";
import Link                    from "next/link";
import { ArrowRight, Loader2, CheckCircle, Printer, Tag, Receipt, XCircle, RotateCcw } from "lucide-react";
import LocationView from "@/components/map/LocationView";

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

const PAYMENT_STATUS_AR: Record<string,{label:string;cls:string}> = {
  pending:               { label:"معلّق",           cls:"bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400" },
  awaiting_confirmation: { label:"بانتظار التأكيد", cls:"bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" },
  paid:                  { label:"مدفوع",            cls:"bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" },
  failed:                { label:"فشل",              cls:"bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" },
  expired:               { label:"منتهي",            cls:"bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  refunded:              { label:"مُسترجع",          cls:"bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400" },
};

interface OrderPayment {
  id: string;
  provider_code: string;
  amount: number;
  currency: string;
  status: string;
  receipt_url: string | null;
  customer_note: string | null;
}

export default function AdminOrderDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const [order,   setOrder]   = useState<Record<string,unknown>|null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [saved,   setSaved]   = useState(false);
  const [statusError, setStatusError] = useState("");
  const [payAction, setPayAction] = useState<"reject"|"revision"|null>(null);
  const [payNote,   setPayNote]   = useState("");
  const [payBusy,   setPayBusy]   = useState(false);
  const [payError,  setPayError]  = useState("");

  const load = () => fetch(`/api/admin/orders/${id}`)
    .then(r=>r.json())
    .then(d=>{ setOrder(d); setNewStatus(d.status); setLoading(false); });

  useEffect(()=>{ load(); },[id]);

  const handleUpdateStatus = async () => {
    setSaving(true); setSaved(false); setStatusError("");
    const res = await fetch(`/api/admin/orders/${id}`,{
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      const d = await res.json().catch(()=>({}));
      setStatusError(d.error ?? "فشل تحديث الحالة");
      setSaving(false);
      return;
    }
    setOrder(o => o ? {...o, status:newStatus} : o);
    setSaving(false); setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  };

  const payments = (order?.payments as OrderPayment[] | undefined) ?? [];
  const payment  = payments[0];

  const handleConfirmPayment = async () => {
    if (!payment) return;
    setPayBusy(true); setPayError("");
    const res = await fetch(`/api/admin/payments/${payment.id}/confirm`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paidAmount: payment.amount }),
    });
    const d = await res.json();
    if (!res.ok || !d.success) { setPayError(d.error ?? "فشل التأكيد"); setPayBusy(false); return; }
    setPayBusy(false);
    load();
  };

  const submitPayAction = async () => {
    if (!payment || !payAction) return;
    if (!payNote.trim()) { setPayError("الملاحظة مطلوبة"); return; }
    setPayBusy(true); setPayError("");
    const path = payAction === "reject" ? "reject" : "request-revision";
    const res = await fetch(`/api/admin/payments/${payment.id}/${path}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payAction === "reject" ? { reason: payNote } : { note: payNote }),
    });
    const d = await res.json();
    if (!res.ok || !d.success) { setPayError(d.error ?? "فشل تنفيذ الإجراء"); setPayBusy(false); return; }
    setPayBusy(false); setPayAction(null); setPayNote("");
    load();
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
  const addr    = order.address_snapshot as Record<string,string|number|null> ?? {};
  const geoLat  = typeof addr.lat === "number" ? addr.lat : Number(addr.lat) || null;
  const geoLng  = typeof addr.lng === "number" ? addr.lng : Number(addr.lng) || null;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin/orders" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-2)] hover:border-brand-300 transition-colors">
          <ArrowRight size={16}/>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[var(--text-1)]" dir="ltr">{order.order_number as string}</h1>
          <p className="text-xs text-[var(--text-muted)]">تفاصيل الطلب</p>
        </div>
        {/* أزرار الطباعة — تفتح في تبويب جديد جاهزة للطباعة */}
        <div className="flex gap-2">
          <a href={`/admin/print/orders/${id}/invoice`} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-1)] hover:border-brand-400 transition-colors">
            <Printer size={14}/> فاتورة
          </a>
          <a href={`/admin/print/orders/${id}/label`} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-1)] hover:border-brand-400 transition-colors">
            <Tag size={14}/> بوليصة شحن
          </a>
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
        {statusError && <p className="text-sm text-red-500 mt-2">⚠ {statusError}</p>}
      </div>

      {/* الدفع وإثبات التحويل — لا تُعرض لطلبات الدفع عند الاستلام (لا إثبات لها) */}
      {payment && payment.provider_code !== "cod" && (
        <div className="card-base p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h2 className="font-semibold text-[var(--text-1)] flex items-center gap-2">
              <Receipt size={15} className="text-brand-700"/> الدفع وإثبات التحويل
            </h2>
            <span className={`text-xs px-2 py-0.5 rounded-md ${PAYMENT_STATUS_AR[payment.status]?.cls ?? "bg-gray-100 text-gray-600"}`}>
              {PAYMENT_STATUS_AR[payment.status]?.label ?? payment.status}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">المبلغ</span>
            <span className="font-bold text-brand-700 dark:text-accent-400">
              {new Intl.NumberFormat("ar-YE").format(payment.amount)} {payment.currency}
            </span>
          </div>

          {(payment.receipt_url || payment.customer_note) ? (
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 p-3 space-y-2 text-sm">
              {payment.customer_note && (
                <p className="text-blue-700 dark:text-blue-300 whitespace-pre-line">{payment.customer_note}</p>
              )}
              {payment.receipt_url && (
                <a href={payment.receipt_url} target="_blank" rel="noreferrer"
                  className="underline font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  📎 فتح صورة الإيصال
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              ⚠ لم يُرفَق أي إثبات دفع بعد — لا يمكن تأكيد الطلب حتى يرفق العميل صورة الإيصال أو ملاحظة
            </p>
          )}

          {payError && <p className="text-sm text-red-500">⚠ {payError}</p>}

          {payment.status !== "paid" && (
            <div className="flex gap-2 flex-wrap pt-1">
              <button onClick={handleConfirmPayment}
                disabled={payBusy || (!payment.receipt_url && !payment.customer_note)}
                className="btn-primary gap-1.5 text-sm">
                {payBusy ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle size={14}/>} تأكيد الدفعة
              </button>
              <button onClick={() => { setPayAction("revision"); setPayNote(""); setPayError(""); }}
                className="btn-ghost border border-[var(--border)] gap-1.5 text-sm">
                <RotateCcw size={14}/> طلب استكمال
              </button>
              <button onClick={() => { setPayAction("reject"); setPayNote(""); setPayError(""); }}
                className="btn-ghost border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 gap-1.5 text-sm">
                <XCircle size={14}/> رفض
              </button>
            </div>
          )}

          {payAction && (
            <div className="rounded-xl border border-[var(--border)] p-3 space-y-2">
              <label className="text-xs font-medium text-[var(--text-2)]">
                {payAction === "reject" ? "سبب الرفض (يُرسَل للعميل)" : "ما المطلوب استكماله (يُرسَل للعميل)"}
              </label>
              <textarea rows={2} value={payNote} onChange={e=>setPayNote(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 resize-none"/>
              <div className="flex gap-2">
                <button onClick={submitPayAction} disabled={payBusy}
                  className={`btn-primary text-sm gap-1.5 ${payAction === "reject" ? "bg-red-600 hover:bg-red-700 border-red-600" : ""}`}>
                  {payBusy ? <Loader2 size={14} className="animate-spin"/> : null}
                  {payAction === "reject" ? "رفض الدفعة" : "إرسال الطلب"}
                </button>
                <button onClick={() => setPayAction(null)} className="btn-ghost border border-[var(--border)] text-sm">إلغاء</button>
              </div>
            </div>
          )}
        </div>
      )}

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
          <p className="text-sm text-[var(--text-2)]">{String(addr.full_name ?? "")} · <span dir="ltr">{String(addr.phone ?? "")}</span></p>
          <p className="text-sm text-[var(--text-2)]">{String(addr.governorate ?? "")}{addr.district ? ` · ${addr.district}` : ""}</p>
          {addr.street ? <p className="text-sm text-[var(--text-2)]">{String(addr.street)}</p> : null}
          {addr.landmark ? <p className="text-xs text-[var(--text-muted)] mt-1">🏷 {String(addr.landmark)}</p> : null}
        </div>
      </div>

      {/* موقع العميل على الخريطة */}
      {geoLat && geoLng && (
        <div className="card-base p-5">
          <h2 className="font-semibold text-[var(--text-1)] mb-3">📍 موقع التوصيل على الخريطة</h2>
          <LocationView lat={geoLat} lng={geoLng} label="افتح الموقع في خرائط جوجل"/>
        </div>
      )}
    </div>
  );
}
