"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ShoppingBag, Clock } from "lucide-react";

const STATUS_OPTS = [
  {value:"",label:"الكل"},{value:"pending",label:"معلّق"},
  {value:"confirmed",label:"مؤكد"},{value:"processing",label:"قيد التجهيز"},
  {value:"out_for_delivery",label:"في الطريق"},{value:"delivered",label:"تم التوصيل"},
  {value:"cancelled",label:"ملغي"},
];

const STATUS_AR: Record<string,{label:string;color:string}> = {
  pending:            {label:"معلّق",       color:"bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"},
  confirmed:          {label:"مؤكد",        color:"bg-blue-100 text-blue-700"},
  processing:         {label:"قيد التجهيز", color:"bg-indigo-100 text-indigo-700"},
  ready_for_delivery: {label:"جاهز",        color:"bg-purple-100 text-purple-700"},
  out_for_delivery:   {label:"في الطريق",   color:"bg-orange-100 text-orange-700"},
  delivered:          {label:"تم التوصيل",  color:"bg-green-100 text-green-700"},
  completed:          {label:"مكتمل",       color:"bg-green-100 text-green-800"},
  cancelled:          {label:"ملغي",        color:"bg-red-100 text-red-700"},
};

interface Order {
  id:string; order_number:string; status:string; payment_status:string;
  total_amount:number; currency:string; created_at:string;
  profiles:{full_name:string;phone:string}|null;
  order_items:{name_snapshot:string;quantity:number}[];
}

export default function AdminOrdersPage() {
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [status,  setStatus]  = useState("");
  const [page,    setPage]    = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams({ page:String(page), limit:"20" });
    if (status) q.set("status", status);
    const r = await fetch(`/api/admin/orders?${q}`);
    const d = await r.json();
    setOrders(d.orders??[]); setTotal(d.total??0); setLoading(false);
  }, [page, status]);

  useEffect(()=>{ load(); }, [load]);

  const totalPages = Math.ceil(total/20);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-1)]">الطلبات</h1>
          <p className="text-sm text-[var(--text-muted)]">{total.toLocaleString("ar")} طلب إجمالاً</p>
        </div>
      </div>

      {/* فلاتر */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTS.map(o=>(
          <button key={o.value} onClick={()=>{setStatus(o.value);setPage(1);}}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${status===o.value?"bg-brand-700 text-white":"border border-[var(--border)] text-[var(--text-2)] hover:border-brand-300"}`}>
            {o.label}
          </button>
        ))}
      </div>

      <div className="card-base overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[1,2,3,4].map(i=><div key={i} className="skeleton h-14 w-full"/>)}</div>
        ) : orders.length===0 ? (
          <div className="py-16 text-center">
            <ShoppingBag size={40} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]"/>
            <p className="font-semibold text-[var(--text-1)]">لا توجد طلبات</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-page)] border-b border-[var(--border)]">
                  <tr>
                    {["رقم الطلب","العميل","الحالة","المبلغ","التاريخ",""].map(h=>(
                      <th key={h} className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {orders.map(o=>{
                    const st = STATUS_AR[o.status]??{label:o.status,color:"bg-gray-100 text-gray-600"};
                    const preview = o.order_items?.slice(0,2).map(i=>i.name_snapshot).join("، ");
                    return (
                      <tr key={o.id} className="hover:bg-[var(--bg-page)] transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-[var(--text-1)]" dir="ltr">{o.order_number}</p>
                          <p className="text-xs text-[var(--text-muted)] line-clamp-1 mt-0.5">{preview}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-[var(--text-1)]">{o.profiles?.full_name??"—"}</p>
                          <p className="text-xs text-[var(--text-muted)]" dir="ltr">{o.profiles?.phone??""}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge px-2.5 py-1 text-xs ${st.color}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-brand-700 dark:text-accent-400 whitespace-nowrap">
                          {new Intl.NumberFormat("ar-YE").format(o.total_amount)} ﷼
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <Clock size={11}/>{new Date(o.created_at).toLocaleDateString("ar-YE")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/admin/orders/${o.id}`} className="text-xs text-brand-700 dark:text-accent-400 hover:underline">تفاصيل</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages>1&&(
              <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
                <p className="text-xs text-[var(--text-muted)]">صفحة {page} من {totalPages}</p>
                <div className="flex gap-1">
                  <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs disabled:opacity-40 hover:border-brand-300 transition-colors text-[var(--text-2)]">← السابق</button>
                  <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs disabled:opacity-40 hover:border-brand-300 transition-colors text-[var(--text-2)]">التالي →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
