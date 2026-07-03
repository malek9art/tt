"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "react-qr-code";
import { Printer, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useStoreSettings } from "@/lib/useStoreSettings";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export default function ShippingLabelPrintPage() {
  const { id } = useParams<{ id: string }>();
  const settings = useStoreSettings();
  const [order, setOrder] = useState<Row | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/orders/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setOrder)
      .catch(() => setError(true));
  }, [id]);

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-500" dir="rtl">
      الطلب غير موجود —{" "}
      <Link href="/admin/orders" className="text-blue-600 underline mr-1">العودة</Link>
    </div>
  );
  if (!order) return (
    <div className="min-h-screen flex items-center justify-center bg-white" dir="rtl">
      <Loader2 className="animate-spin text-gray-400" size={28}/>
    </div>
  );

  const addr     = (order.address_snapshot as Row) ?? {};
  const items    = (order.order_items as Row[]) ?? [];
  const pieces   = items.reduce((s, i) => s + Number(i.quantity ?? 0), 0);
  const fmt      = (n: number) => new Intl.NumberFormat("ar-YE").format(n ?? 0);
  const isPaid   = order.payment_status === "paid";
  const codValue = isPaid ? 0 : Number(order.total_amount ?? 0);
  const trackUrl = order.tracking_token
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/track/${order.tracking_token}`
    : String(order.order_number);

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white" dir="rtl">
      {/* شريط أدوات — يختفي عند الطباعة */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-3 bg-white border-b border-gray-200 px-5 py-3 shadow-sm">
        <Link href={`/admin/orders/${id}`}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowRight size={16}/> العودة للطلب
        </Link>
        <p className="text-xs text-gray-400">مقاس الملصق: 10×15 سم (حراري) — اختر هذا المقاس من إعدادات الطابعة</p>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-700 transition-colors">
          <Printer size={16}/> طباعة البوليصة
        </button>
      </div>

      {/* البوليصة */}
      <div className="label-sheet mx-auto my-6 print:my-0 w-[100mm] h-[150mm] bg-white text-black border border-gray-300 print:border-0 flex flex-col overflow-hidden">

        {/* المرسل */}
        <div className="flex items-center justify-between gap-2 border-b-2 border-black px-3 py-2">
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{settings.name || "مركز الأحمدي للجوالات"}</p>
            {settings.phone && <p className="text-[11px]" dir="ltr">{settings.phone}</p>}
          </div>
          <span className="shrink-0 rounded border-2 border-black px-2 py-0.5 text-[11px] font-bold">بوليصة شحن</span>
        </div>

        {/* رقم الطلب + QR */}
        <div className="flex items-center justify-between gap-2 border-b border-dashed border-gray-400 px-3 py-2.5">
          <div>
            <p className="text-[10px] text-gray-500">رقم الطلب</p>
            <p className="font-mono font-bold text-lg leading-tight" dir="ltr">{order.order_number}</p>
            <p className="text-[10px] text-gray-500 mt-1">
              {new Date(String(order.created_at)).toLocaleDateString("ar-YE")}
              {" · "}{pieces} قطعة
            </p>
          </div>
          <QRCode value={trackUrl} size={72}/>
        </div>

        {/* المرسل إليه */}
        <div className="flex-1 px-3 py-2.5 space-y-1">
          <p className="text-[10px] font-bold text-gray-500">المرسل إليه</p>
          <p className="font-bold text-xl leading-snug">{addr.full_name ?? "—"}</p>
          <p className="font-bold text-lg" dir="ltr">{addr.phone ?? ""}</p>
          <div className="text-sm leading-relaxed pt-1">
            <p className="font-bold">{addr.governorate ?? ""}{addr.district ? ` — ${addr.district}` : ""}</p>
            {addr.street && <p>{addr.street}</p>}
            {addr.landmark && <p className="text-gray-600 text-xs">🏷 {addr.landmark}</p>}
            {addr.lat && addr.lng ? (
              <p className="text-[10px] text-gray-500 mt-1" dir="ltr">
                📍 {Number(addr.lat).toFixed(5)}, {Number(addr.lng).toFixed(5)}
              </p>
            ) : null}
          </div>
          {order.notes ? (
            <p className="text-[11px] text-gray-600 border-t border-dashed border-gray-300 pt-1.5 mt-1.5">
              ملاحظات: {String(order.notes)}
            </p>
          ) : null}
        </div>

        {/* مبلغ التحصيل */}
        <div className={`border-t-2 border-black px-3 py-2.5 ${codValue > 0 ? "bg-black text-white" : ""}`}>
          {codValue > 0 ? (
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">المطلوب تحصيله عند التسليم</span>
              <span className="font-bold text-2xl">{fmt(codValue)} ﷼</span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">حالة الدفع</span>
              <span className="font-bold text-lg">✓ مدفوع مسبقاً — لا تحصيل</span>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: 100mm 150mm; margin: 0; }
          body { background: white !important; }
          .label-sheet { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
