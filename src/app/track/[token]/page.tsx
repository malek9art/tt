"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Package, Truck, CheckCircle, Clock, XCircle, MapPin } from "lucide-react";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STEPS = [
  { key:"pending",            label:"تم استلام الطلب",   icon:Clock,        color:"text-yellow-500" },
  { key:"confirmed",          label:"تم تأكيد الطلب",    icon:CheckCircle,  color:"text-blue-500"   },
  { key:"processing",         label:"جارٍ التجهيز",       icon:Package,      color:"text-indigo-500" },
  { key:"out_for_delivery",   label:"في الطريق إليك",    icon:Truck,        color:"text-orange-500" },
  { key:"delivered",          label:"تم التوصيل",         icon:CheckCircle,  color:"text-green-500"  },
];

const STATUS_MAP: Record<string,number> = {
  pending:0, confirmed:1, processing:2,
  ready_for_delivery:2, out_for_delivery:3, delivered:4, completed:4,
};

interface OrderData {
  id: string; order_number: string; status: string;
  total_amount: number; currency: string; created_at: string;
  address_snapshot: { governorate?:string; district?:string; full_name?:string; phone?:string };
  order_items: { name_snapshot:string; quantity:number; price:number }[];
  shipments: { status:string; tracking_number:string|null; estimated_at:string|null }[];
}

export default function TrackPage() {
  const { token } = useParams<{ token: string }>();
  const [order,   setOrder]   = useState<OrderData|null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound,setNotFound]= useState(false);

  useEffect(() => {
    if (!token) return;
    sb.from("orders")
      .select(`
        id, order_number, status, total_amount, currency, created_at,
        address_snapshot,
        order_items(name_snapshot, quantity, price),
        shipments(status, tracking_number, estimated_at)
      `)
      .eq("tracking_token", token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); }
        else { setOrder(data as OrderData); }
        setLoading(false);
      });
  }, [token]);

  if (loading) return (
    <div className="min-h-screen">
      <Header/>
      <div className="container-main py-12 max-w-2xl mx-auto space-y-4">
        <div className="skeleton h-8 w-48"/>
        <div className="skeleton h-40 w-full rounded-xl"/>
        <div className="skeleton h-32 w-full rounded-xl"/>
      </div>
      <Footer/>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen">
      <Header/>
      <div className="container-main py-20 text-center max-w-md mx-auto">
        <XCircle size={56} className="mx-auto mb-4 text-red-400"/>
        <h1 className="text-2xl font-bold text-[var(--text-1)] mb-2">الطلب غير موجود</h1>
        <p className="text-[var(--text-muted)] mb-6">تأكد من رابط التتبع وحاول مجدداً</p>
        <Link href="/" className="btn-primary">العودة للرئيسية</Link>
      </div>
      <Footer/>
    </div>
  );

  if (!order) return null;

  const stepIdx = STATUS_MAP[order.status] ?? 0;
  const cancelled = order.status === "cancelled";
  const shipment = order.shipments?.[0];

  return (
    <div className="min-h-screen">
      <Header/>
      <div className="container-main py-8 max-w-2xl mx-auto space-y-5">
        {/* رأس الصفحة */}
        <div className="text-center">
          <p className="text-sm text-[var(--text-muted)] mb-1">تتبع الطلب</p>
          <h1 className="text-2xl font-bold text-[var(--text-1)]" dir="ltr">{order.order_number}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {new Date(order.created_at).toLocaleDateString("ar-YE", { weekday:"long", day:"numeric", month:"long" })}
          </p>
        </div>

        {/* خطوات التتبع */}
        {!cancelled ? (
          <div className="card-base p-6">
            <div className="space-y-4">
              {STEPS.map((step, i) => {
                const done    = i <= stepIdx;
                const current = i === stepIdx;
                const Icon    = step.icon;
                return (
                  <div key={step.key} className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                      done
                        ? `border-brand-700 bg-brand-700 ${step.color} text-white`
                        : "border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-muted)]"
                    }`}>
                      <Icon size={18}/>
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${done ? "text-[var(--text-1)]" : "text-[var(--text-muted)]"}`}>
                        {step.label}
                      </p>
                      {current && shipment?.estimated_at && (
                        <p className="text-xs text-brand-700 dark:text-accent-400 mt-0.5">
                          الوقت المتوقع: {new Date(shipment.estimated_at).toLocaleString("ar-YE")}
                        </p>
                      )}
                    </div>
                    {current && (
                      <div className="h-2 w-2 rounded-full bg-brand-700 animate-pulse"/>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="card-base p-6 text-center border-red-200 dark:border-red-800">
            <XCircle size={40} className="mx-auto mb-3 text-red-400"/>
            <p className="font-bold text-[var(--text-1)]">تم إلغاء الطلب</p>
          </div>
        )}

        {/* عنوان التوصيل */}
        <div className="card-base p-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={16} className="text-brand-700"/>
            <h2 className="font-semibold text-[var(--text-1)]">عنوان التوصيل</h2>
          </div>
          <p className="text-sm text-[var(--text-2)]">
            {order.address_snapshot?.full_name} · {order.address_snapshot?.phone}
          </p>
          <p className="text-sm text-[var(--text-2)]">
            {order.address_snapshot?.governorate}
            {order.address_snapshot?.district ? ` · ${order.address_snapshot.district}` : ""}
          </p>
        </div>

        {/* المنتجات */}
        <div className="card-base overflow-hidden">
          <div className="border-b border-[var(--border)] px-5 py-3">
            <h2 className="font-semibold text-[var(--text-1)]">المنتجات</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {order.order_items?.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-[var(--text-1)]">{item.name_snapshot}</p>
                  <p className="text-xs text-[var(--text-muted)]">الكمية: {item.quantity}</p>
                </div>
                <p className="text-sm font-bold text-brand-700 dark:text-accent-400">
                  {new Intl.NumberFormat("ar-YE").format(item.price * item.quantity)} ﷼
                </p>
              </div>
            ))}
            <div className="flex items-center justify-between px-5 py-3 bg-[var(--bg-page)]">
              <span className="font-bold text-[var(--text-1)]">الإجمالي</span>
              <span className="text-lg font-bold text-brand-700 dark:text-accent-400">
                {new Intl.NumberFormat("ar-YE").format(order.total_amount)} ﷼
              </span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--text-muted)]">
          مركز الأحمدي للجوالات ومستلزماتها · تعز، اليمن
        </p>
      </div>
      <Footer/>
    </div>
  );
}
