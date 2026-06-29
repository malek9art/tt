"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Tag, Plus, Percent, Calendar, Trash2 } from "lucide-react";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Coupon {
  id: string; code: string; discount_type: string;
  discount_value: number; min_order_amount: number | null;
  max_uses: number | null; used_count: number;
  expires_at: string | null; is_active: boolean;
}

export default function MarketingPage() {
  const [coupons,  setCoupons]  = useState<Coupon[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code:"", discount_type:"percentage", discount_value:10,
    min_order_amount:"", max_uses:"", expires_at:"",
  });

  const load = async () => {
    const { data } = await sb.from("coupons").select("*").order("created_at", { ascending: false });
    setCoupons(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.code.trim()) return;
    await sb.from("coupons").insert({
      code:            form.code.toUpperCase().trim(),
      discount_type:   form.discount_type,
      discount_value:  Number(form.discount_value),
      min_order_amount:form.min_order_amount ? Number(form.min_order_amount) : null,
      max_uses:        form.max_uses ? Number(form.max_uses) : null,
      expires_at:      form.expires_at || null,
      is_active:       true,
    });
    setForm({ code:"", discount_type:"percentage", discount_value:10, min_order_amount:"", max_uses:"", expires_at:"" });
    setShowForm(false);
    load();
  };

  const toggleCoupon = async (id: string, current: boolean) => {
    await sb.from("coupons").update({ is_active: !current }).eq("id", id);
    setCoupons(c => c.map(x => x.id === id ? { ...x, is_active: !current } : x));
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm("حذف هذا الكوبون؟")) return;
    await sb.from("coupons").delete().eq("id", id);
    setCoupons(c => c.filter(x => x.id !== id));
  };

  const iCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-1)]">التسويق</h1>
          <p className="text-sm text-[var(--text-muted)]">كوبونات الخصم والعروض</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary gap-2">
          <Plus size={16}/> كوبون جديد
        </button>
      </div>

      {/* نموذج إنشاء كوبون */}
      {showForm && (
        <div className="card-base p-5 space-y-4">
          <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3">إنشاء كوبون خصم</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">كود الكوبون *</label>
              <input type="text" dir="ltr" placeholder="SUMMER20"
                value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value.toUpperCase()}))}
                className={iCls}/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">نوع الخصم</label>
              <select value={form.discount_type} onChange={e=>setForm(f=>({...f,discount_type:e.target.value}))} className={iCls}>
                <option value="percentage">نسبة مئوية (%)</option>
                <option value="fixed">مبلغ ثابت (YER)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">
                قيمة الخصم {form.discount_type==="percentage"?"(%)":"(YER)"}
              </label>
              <input type="number" min="1" dir="ltr"
                value={form.discount_value} onChange={e=>setForm(f=>({...f,discount_value:Number(e.target.value)}))}
                className={iCls}/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الحد الأدنى للطلب (YER)</label>
              <input type="number" min="0" dir="ltr" placeholder="اختياري"
                value={form.min_order_amount} onChange={e=>setForm(f=>({...f,min_order_amount:e.target.value}))}
                className={iCls}/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الحد الأقصى للاستخدام</label>
              <input type="number" min="1" dir="ltr" placeholder="غير محدود"
                value={form.max_uses} onChange={e=>setForm(f=>({...f,max_uses:e.target.value}))}
                className={iCls}/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">تاريخ الانتهاء</label>
              <input type="datetime-local" dir="ltr"
                value={form.expires_at} onChange={e=>setForm(f=>({...f,expires_at:e.target.value}))}
                className={iCls}/>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="btn-ghost border border-[var(--border)] flex-1">إلغاء</button>
            <button onClick={handleCreate} className="btn-primary flex-1 justify-center">إنشاء الكوبون</button>
          </div>
        </div>
      )}

      {/* قائمة الكوبونات */}
      <div className="card-base overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-16 w-full"/>)}</div>
        ) : coupons.length === 0 ? (
          <div className="py-16 text-center">
            <Tag size={40} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]"/>
            <p className="text-[var(--text-muted)]">لا توجد كوبونات بعد</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-page)] border-b border-[var(--border)]">
              <tr>{["الكود","الخصم","الاستخدام","الانتهاء","الحالة",""].map(h=>(
                <th key={h} className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)]">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {coupons.map(c => (
                <tr key={c.id} className="hover:bg-[var(--bg-page)] transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-brand-700 dark:text-accent-400" dir="ltr">{c.code}</td>
                  <td className="px-4 py-3 text-[var(--text-1)]">
                    {c.discount_type==="percentage" ? <><Percent size={12} className="inline"/>{c.discount_value}%</> : `${c.discount_value} ﷼`}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {c.used_count} / {c.max_uses ?? "∞"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {c.expires_at ? <span className="flex items-center gap-1"><Calendar size={11}/>{new Date(c.expires_at).toLocaleDateString("ar-YE")}</span> : "بلا انتهاء"}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleCoupon(c.id, c.is_active)}
                      className={`badge px-2.5 py-1 cursor-pointer ${c.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500"}`}>
                      {c.is_active ? "نشط" : "معطّل"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteCoupon(c.id)} className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 size={15}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
