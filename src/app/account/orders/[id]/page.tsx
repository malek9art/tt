"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useAuthStore } from "@/store/authStore";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Image  from "next/image";
import Link   from "next/link";
import {
  Package, MapPin, CheckCircle, Clock, Truck,
  XCircle, ChevronLeft, Phone, Camera
} from "lucide-react";
import { formatPrice } from "@/lib/api";
import ReceiptAttach from "@/components/payment/ReceiptAttach";

const PAYMENT_STATUS_AR: Record<string, { label: string; cls: string }> = {
  pending:               { label: "بانتظار الدفع",   cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  awaiting_confirmation: { label: "قيد المراجعة",     cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  paid:                  { label: "تم التحقق ✓",      cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  failed:                { label: "مرفوض",            cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  expired:               { label: "انتهت المهلة",     cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  refunded:              { label: "تم الاسترجاع",     cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
};

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ORDER_STEPS = [
  { key:"pending",             label:"استلمنا طلبك",      icon:Package   },
  { key:"confirmed",           label:"تم تأكيد الطلب",   icon:CheckCircle },
  { key:"processing",          label:"قيد التجهيز",       icon:Clock     },
  { key:"ready_for_delivery",  label:"جاهز للتوصيل",     icon:Package   },
  { key:"out_for_delivery",    label:"المندوب في الطريق", icon:Truck     },
  { key:"delivered",           label:"تم التوصيل",        icon:CheckCircle },
];

const STATUS_IDX: Record<string,number> = {
  pending:0, confirmed:1, processing:2,
  ready_for_delivery:3, out_for_delivery:4,
  delivered:5, completed:5, cancelled:-1,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string,any>;

export default function OrderDetailPage() {
  const { id }    = useParams<{ id:string }>();
  const { user, loading: authLoading } = useAuthStore();
  const router    = useRouter();
  const [order,   setOrder]   = useState<Row|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return; // ننتظر تحميل الجلسة قبل الحكم
    if (!user) { router.replace("/login?redirectTo=/account/orders"); return; }

    sb.from("orders")
      .select(`
        id, order_number, status, payment_status,
        subtotal, shipping_fee, discount_amount, total_amount, currency,
        address_snapshot, notes, created_at, updated_at,
        tracking_token,
        payments(id, provider_code, status, amount, currency, reference_code, review_note, receipt_url, customer_note),
        order_items(
          id, name_snapshot, sku_snapshot, attrs_snapshot,
          price, quantity, subtotal,
          product:product_id(product_images(url, is_primary))
        ),
        shipments(
          id, tracking_number, status,
          assigned_at, picked_up_at, delivered_at,
          proof_photo_url, carrier_notes,
          driver:driver_id(
            profiles(full_name, phone)
          )
        )
      `)
      .eq("id", id)
      .eq("customer_id", user.id)
      .single()
      .then(({ data }) => {
        setOrder(data as Row);
        setLoading(false);
      });
  }, [id, user, authLoading, router]);

  if (loading) return (
    <div className="min-h-screen">
      <Header/>
      <div className="container-main py-8 max-w-2xl space-y-4">
        {[1,2,3].map(i=><div key={i} className="skeleton h-32 w-full rounded-xl"/>)}
      </div>
      <Footer/>
    </div>
  );

  if (!order) return (
    <div className="min-h-screen">
      <Header/>
      <div className="container-main py-20 text-center">
        <p className="text-[var(--text-muted)]">الطلب غير موجود</p>
        <Link href="/account/orders" className="btn-primary mt-4 inline-flex">← طلباتي</Link>
      </div>
      <Footer/>
    </div>
  );

  const items    = (order.order_items as Row[]) ?? [];
  const addr     = order.address_snapshot as Row;
  // أحدث عملية دفع للطلب
  const paysRaw  = order.payments as Row[] | Row | null;
  const paysArr  = Array.isArray(paysRaw) ? paysRaw : paysRaw ? [paysRaw] : [];
  const payment  = paysArr[paysArr.length - 1] ?? null;
  const payCfg   = payment ? (PAYMENT_STATUS_AR[String(payment.status)] ?? PAYMENT_STATUS_AR.pending) : null;
  const canResubmitProof = payment
    && ["pending", "awaiting_confirmation"].includes(String(payment.status))
    && !["cod", "stripe"].includes(String(payment.provider_code));
  const shipsArr = order.shipments as Row[] | Row | null;
  const ship     = Array.isArray(shipsArr) ? shipsArr[0] : (shipsArr ?? null);
  const statusIdx = STATUS_IDX[String(order.status)] ?? 0;
  const cancelled  = order.status === "cancelled";

  // بيانات المندوب
  const driverRaw  = ship ? (ship.driver as Row|null) : null;
  const driverProf = driverRaw
    ? (Array.isArray(driverRaw.profiles) ? driverRaw.profiles[0] : driverRaw.profiles) as Row|null
    : null;

  return (
    <div className="min-h-screen">
      <Header/>
      <div className="container-main py-8 max-w-2xl space-y-5">
        {/* رأس الصفحة */}
        <div className="flex items-center gap-3">
          <Link href="/account/orders"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-2)] hover:border-brand-300 transition-colors">
            <ChevronLeft size={16}/>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-1)]" dir="ltr">
              #{String(order.order_number)}
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              {new Date(String(order.created_at)).toLocaleDateString("ar-YE",{
                weekday:"long", day:"numeric", month:"long", year:"numeric",
              })}
            </p>
          </div>
          {order.tracking_token ? (
            <Link href={`/track/${String(order.tracking_token)}`}
              className="mr-auto btn-ghost border border-[var(--border)] text-sm gap-1.5 hover:border-brand-400">
              📦 تتبع الشحنة
            </Link>
          ) : null}
        </div>

        {/* شريط التقدم */}
        {!cancelled ? (
          <div className="card-base p-5">
            <div className="flex items-start">
              {ORDER_STEPS.map((s, i) => {
                const done    = i <= statusIdx;
                const current = i === statusIdx;
                const Icon    = s.icon;
                return (
                  <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
                    <div className="flex items-center w-full">
                      {i > 0 && (
                        <div className={`h-0.5 flex-1 transition-colors ${i <= statusIdx ? "bg-brand-700" : "bg-[var(--border)]"}`}/>
                      )}
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                        done
                          ? current ? "bg-brand-700 text-white ring-2 ring-brand-300" : "bg-brand-700 text-white"
                          : "bg-[var(--border)] text-[var(--text-muted)]"
                      }`}>
                        <Icon size={14}/>
                      </div>
                      {i < ORDER_STEPS.length-1 && (
                        <div className={`h-0.5 flex-1 ${i < statusIdx ? "bg-brand-700" : "bg-[var(--border)]"}`}/>
                      )}
                    </div>
                    <span className={`text-[10px] text-center leading-tight mt-1 ${
                      current ? "text-brand-700 dark:text-accent-400 font-semibold" : "text-[var(--text-muted)]"
                    }`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="card-base p-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <XCircle size={20}/>
              <span className="font-semibold">تم إلغاء هذا الطلب</span>
            </div>
          </div>
        )}

        {/* حالة الدفع */}
        {payment && payCfg && (
          <div className="card-base p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-semibold text-[var(--text-1)]">💳 حالة الدفع</h2>
              <span className={`badge text-xs px-2.5 py-1 ${payCfg.cls}`}>{payCfg.label}</span>
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between rounded-lg bg-[var(--bg-page)] px-3 py-2">
                <span className="text-[var(--text-muted)]">المبلغ</span>
                <span className="font-bold text-[var(--text-1)]">
                  {Number(payment.amount).toLocaleString("ar")} {String(payment.currency)}
                </span>
              </div>
              {payment.reference_code ? (
                <div className="flex justify-between items-center rounded-lg bg-[var(--bg-page)] px-3 py-2">
                  <span className="text-[var(--text-muted)]">مرجع الدفع</span>
                  <span className="font-mono font-bold text-brand-700 dark:text-accent-400" dir="ltr">
                    {String(payment.reference_code)}
                  </span>
                </div>
              ) : null}
            </div>

            {/* ملاحظة المراجعة / سبب الرفض من الإدارة */}
            {payment.review_note ? (
              <div className={`rounded-xl border p-3 text-sm ${
                payment.status === "failed"
                  ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
                  : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
              }`}>
                <b>{payment.status === "failed" ? "سبب عدم الاعتماد: " : "ملاحظة من الإدارة: "}</b>
                {String(payment.review_note)}
              </div>
            ) : null}

            {/* إعادة رفع الإثبات للوسائل اليدوية */}
            {canResubmitProof ? <ReceiptAttach paymentId={String(payment.id)}/> : null}
          </div>
        )}

        {/* المنتجات */}
        <div className="card-base overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--text-1)]">المنتجات</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {items.map(item => {
              const prodRaw = item.product as Row | Row[] | null;
              const prod  = Array.isArray(prodRaw) ? prodRaw[0] : prodRaw;
              const imgs  = (prod?.product_images ?? null) as Row[]|null;
              const img   = imgs?.find((i:Row)=>i.is_primary)?.url ?? imgs?.[0]?.url;
              const attrs = item.attrs_snapshot as Record<string,string>|null;
              return (
                <div key={String(item.id)} className="flex items-center gap-4 px-5 py-4">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-brand-50">
                    {img
                      ? <Image src={String(img)} alt={String(item.name_snapshot)} fill sizes="56px" className="object-cover"/>
                      : <div className="flex h-full items-center justify-center text-xl">📱</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[var(--text-1)] line-clamp-2">
                      {String(item.name_snapshot)}
                    </p>
                    {attrs && Object.keys(attrs).length > 0 && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {Object.values(attrs).join(" / ")}
                      </p>
                    )}
                    <p className="text-xs text-[var(--text-muted)]">
                      × {Number(item.quantity)} وحدة
                    </p>
                  </div>
                  <p className="text-sm font-bold text-[var(--text-1)] whitespace-nowrap">
                    {formatPrice(Number(item.subtotal), String(order.currency))}
                  </p>
                </div>
              );
            })}
          </div>
          {/* الملخص المالي */}
          <div className="bg-[var(--bg-page)] border-t border-[var(--border)] px-5 py-4 space-y-2">
            {[
              { label:"المجموع الفرعي", value:Number(order.subtotal) },
              { label:"الشحن",           value:Number(order.shipping_fee) },
              ...(Number(order.discount_amount)>0
                ? [{ label:"الخصم", value:-Number(order.discount_amount) }]
                : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm text-[var(--text-2)]">
                <span>{label}</span>
                <span className={value<0?"text-green-600":""}>{value<0?"-":""}{Math.abs(value).toLocaleString("ar")} ﷼</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-[var(--text-1)] border-t border-[var(--border)] pt-2">
              <span>الإجمالي</span>
              <span className="text-brand-700 dark:text-accent-400 text-lg">
                {Number(order.total_amount).toLocaleString("ar")} ﷼
              </span>
            </div>
          </div>
        </div>

        {/* عنوان التوصيل */}
        {addr && (
          <div className="card-base p-5">
            <h2 className="font-semibold text-[var(--text-1)] mb-3 flex items-center gap-2">
              <MapPin size={15} className="text-brand-700"/> عنوان التوصيل
            </h2>
            <p className="font-semibold text-[var(--text-1)]">{String(addr.full_name)}</p>
            <p className="text-sm text-[var(--text-2)]" dir="ltr">{String(addr.phone)}</p>
            <p className="text-sm text-[var(--text-2)] mt-1">
              {String(addr.governorate)}
              {addr.district && ` · ${String(addr.district)}`}
              {addr.street   && ` · ${String(addr.street)}`}
            </p>
            {addr.landmark && (
              <p className="text-xs text-[var(--text-muted)] mt-1">علامة: {String(addr.landmark)}</p>
            )}
          </div>
        )}

        {/* معلومات الشحن والمندوب */}
        {ship && (
          <div className="card-base p-5">
            <h2 className="font-semibold text-[var(--text-1)] mb-3 flex items-center gap-2">
              <Truck size={15} className="text-brand-700"/> تفاصيل الشحنة
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">رقم التتبع</span>
                <span className="font-mono font-medium text-[var(--text-1)]" dir="ltr">
                  {String(ship.tracking_number)}
                </span>
              </div>
              {driverProf && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)]">المندوب</span>
                    <span className="font-medium text-[var(--text-1)]">
                      {String(driverProf.full_name ?? "—")}
                    </span>
                  </div>
                  {driverProf.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">هاتف المندوب</span>
                      <a href={`tel:${String(driverProf.phone)}`}
                        className="font-medium text-brand-700 dark:text-accent-400 hover:underline flex items-center gap-1"
                        dir="ltr">
                        <Phone size={12}/> {String(driverProf.phone)}
                      </a>
                    </div>
                  )}
                </>
              )}
              {ship.picked_up_at && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">وقت الاستلام</span>
                  <span className="text-[var(--text-1)]">
                    {new Date(String(ship.picked_up_at)).toLocaleString("ar-YE")}
                  </span>
                </div>
              )}
              {ship.delivered_at && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">وقت التوصيل</span>
                  <span className="text-green-600 font-medium">
                    {new Date(String(ship.delivered_at)).toLocaleString("ar-YE")}
                  </span>
                </div>
              )}
              {ship.carrier_notes && (
                <div className="rounded-lg bg-[var(--bg-page)] p-3 text-xs text-[var(--text-muted)] mt-2">
                  ملاحظة المندوب: {String(ship.carrier_notes)}
                </div>
              )}
              {/* صورة إثبات التوصيل */}
              {ship.proof_photo_url && (
                <div className="mt-3">
                  <p className="text-xs text-[var(--text-muted)] mb-2 flex items-center gap-1">
                    <Camera size={12}/> صورة إثبات التوصيل
                  </p>
                  <div className="rounded-xl overflow-hidden border border-green-200 dark:border-green-800">
                    <img src={String(ship.proof_photo_url)} alt="إثبات التوصيل"
                      className="w-full h-40 object-cover"/>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <Footer/>
    </div>
  );
}
