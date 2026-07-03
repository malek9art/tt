"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "react-qr-code";
import { Printer, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useStoreSettings } from "@/lib/useStoreSettings";

const PAY_LABELS: Record<string, string> = {
  cod: "الدفع عند الاستلام", jawali: "جوالي", jeeb: "جيب", floosak: "فلوسك",
  onecash: "ون كاش", kuraimi: "الكريمي", stripe: "بطاقة دولية", bank: "تحويل بنكي",
};
const PAY_STATUS: Record<string, string> = {
  pending: "قيد الدفع", paid: "مدفوع", failed: "فشل", refunded: "مسترد",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export default function InvoicePrintPage() {
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
      الطلب غير موجود أو لا تملك صلاحية —{" "}
      <Link href="/admin/orders" className="text-blue-600 underline mr-1">العودة</Link>
    </div>
  );
  if (!order) return (
    <div className="min-h-screen flex items-center justify-center bg-white" dir="rtl">
      <Loader2 className="animate-spin text-gray-400" size={28}/>
    </div>
  );

  const items    = (order.order_items as Row[]) ?? [];
  const addr     = (order.address_snapshot as Row) ?? {};
  const payments = (order.payments as Row[]) ?? [];
  const pay      = payments[0] ?? null;
  const fmt      = (n: number) => new Intl.NumberFormat("ar-YE").format(n ?? 0);
  const trackUrl = order.tracking_token
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/track/${order.tracking_token}`
    : null;
  const created  = new Date(String(order.created_at));

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white" dir="rtl">
      {/* شريط أدوات — يختفي عند الطباعة */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-3 bg-white border-b border-gray-200 px-5 py-3 shadow-sm">
        <Link href={`/admin/orders/${id}`}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowRight size={16}/> العودة للطلب
        </Link>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-700 transition-colors">
          <Printer size={16}/> طباعة الفاتورة
        </button>
      </div>

      {/* الفاتورة */}
      <div className="mx-auto my-6 print:my-0 w-[210mm] max-w-full bg-white text-gray-900 shadow-lg print:shadow-none p-[12mm] text-sm">

        {/* الترويسة */}
        <div className="flex items-start justify-between gap-4 border-b-2 border-gray-900 pb-5">
          <div>
            <h1 className="text-2xl font-bold">{settings.name || "مركز الأحمدي للجوالات"}</h1>
            {settings.tagline && <p className="text-gray-500 text-xs mt-0.5">{settings.tagline}</p>}
            <div className="mt-2 space-y-0.5 text-xs text-gray-600">
              {settings.address && <p>📍 {settings.address}</p>}
              {settings.phone   && <p dir="ltr" className="text-right">📞 {settings.phone}</p>}
              {settings.email   && <p dir="ltr" className="text-right">✉️ {settings.email}</p>}
            </div>
          </div>
          <div className="text-left shrink-0">
            <p className="text-3xl font-bold tracking-wide">فاتورة</p>
            <p className="mt-2 font-mono font-bold text-lg" dir="ltr">{order.order_number}</p>
            <p className="text-xs text-gray-500 mt-1">
              {created.toLocaleDateString("ar-YE", { day: "numeric", month: "long", year: "numeric" })}
              {" — "}
              {created.toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>

        {/* العميل + التتبع */}
        <div className="flex items-start justify-between gap-4 py-5 border-b border-gray-200">
          <div>
            <p className="text-xs font-bold text-gray-400 mb-1.5">فاتورة إلى</p>
            <p className="font-bold text-base">{addr.full_name ?? "—"}</p>
            <p dir="ltr" className="text-right text-gray-700">{addr.phone ?? ""}</p>
            <p className="text-gray-600 text-xs mt-1">
              {addr.governorate}{addr.district ? ` · ${addr.district}` : ""}{addr.street ? ` · ${addr.street}` : ""}
            </p>
            {addr.landmark && <p className="text-gray-500 text-xs">علامة: {addr.landmark}</p>}
          </div>
          {trackUrl && (
            <div className="text-center shrink-0">
              <QRCode value={trackUrl} size={76}/>
              <p className="text-[10px] text-gray-400 mt-1">امسح لتتبع الطلب</p>
            </div>
          )}
        </div>

        {/* المنتجات */}
        <table className="w-full mt-5 border-collapse">
          <thead>
            <tr className="bg-gray-900 text-white text-xs">
              <th className="py-2.5 px-3 text-right font-bold">#</th>
              <th className="py-2.5 px-3 text-right font-bold">المنتج</th>
              <th className="py-2.5 px-3 text-center font-bold">الكمية</th>
              <th className="py-2.5 px-3 text-left font-bold whitespace-nowrap">سعر الوحدة</th>
              <th className="py-2.5 px-3 text-left font-bold">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const attrs = item.attrs_snapshot as Record<string, string> | null;
              return (
                <tr key={i} className="border-b border-gray-200">
                  <td className="py-2.5 px-3 text-gray-400">{i + 1}</td>
                  <td className="py-2.5 px-3">
                    <p className="font-medium">{item.name_snapshot}</p>
                    {attrs && Object.keys(attrs).length > 0 && (
                      <p className="text-[11px] text-gray-500">{Object.values(attrs).join(" / ")}</p>
                    )}
                    {item.sku_snapshot && <p className="text-[10px] text-gray-400 font-mono" dir="ltr">{item.sku_snapshot}</p>}
                  </td>
                  <td className="py-2.5 px-3 text-center">{item.quantity}</td>
                  <td className="py-2.5 px-3 text-left whitespace-nowrap">{fmt(item.price)} ﷼</td>
                  <td className="py-2.5 px-3 text-left font-bold whitespace-nowrap">{fmt(item.subtotal)} ﷼</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* الإجماليات */}
        <div className="flex justify-start mt-5">
          <div className="w-64 space-y-1.5">
            <div className="flex justify-between text-gray-600">
              <span>المجموع الفرعي</span><span>{fmt(order.subtotal)} ﷼</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>الشحن</span>
              <span>{Number(order.shipping_fee) === 0 ? "مجاني" : `${fmt(order.shipping_fee)} ﷼`}</span>
            </div>
            {Number(order.discount_amount) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>الخصم</span><span>- {fmt(order.discount_amount)} ﷼</span>
              </div>
            )}
            <div className="flex justify-between border-t-2 border-gray-900 pt-2 text-lg font-bold">
              <span>الإجمالي</span><span>{fmt(order.total_amount)} ﷼</span>
            </div>
          </div>
        </div>

        {/* الدفع */}
        <div className="mt-6 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 flex items-center justify-between text-xs">
          <span>
            طريقة الدفع: <b>{pay ? (PAY_LABELS[pay.provider_code] ?? pay.provider_code) : "—"}</b>
          </span>
          <span>
            حالة الدفع: <b>{PAY_STATUS[String(order.payment_status)] ?? order.payment_status}</b>
          </span>
        </div>

        {order.notes && (
          <p className="mt-3 text-xs text-gray-500">ملاحظات: {String(order.notes)}</p>
        )}

        {/* التذييل */}
        <div className="mt-8 border-t border-gray-200 pt-4 text-center text-[11px] text-gray-400">
          <p>شكراً لتسوقكم من {settings.name || "مركز الأحمدي للجوالات"} 🌟</p>
          <p className="mt-1">للاستفسار أو الإرجاع خلال 3 أيام تواصلوا معنا{settings.phone ? ` — ${settings.phone}` : ""}</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
