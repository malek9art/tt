"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Tag, Copy, CheckCircle, Loader2 } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  per_user_limit: number;
  current_uses: number;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

const EMPTY = { code: "", discount_type: "percentage", discount_value: 10, min_order_amount: "", max_uses: "", per_user_limit: "1", valid_until: "" };

export default function MarketingPage() {
  const [coupons,  setCoupons]  = useState<Coupon[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState(EMPTY);
  const [copied,   setCopied]   = useState<string|null>(null);
  const [error,    setError]    = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/coupons");
    const json = await res.json();
    setCoupons(res.ok ? (json.coupons ?? []) : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.code.trim()) { setError("أدخل كود الكوبون"); return; }
    if (!form.discount_value || Number(form.discount_value) <= 0) { setError("أدخل قيمة الخصم"); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code:             form.code.trim().toUpperCase(),
        discount_type:    form.discount_type,
        discount_value:   Number(form.discount_value),
        min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : null,
        max_uses:         form.max_uses ? Number(form.max_uses) : null,
        per_user_limit:   form.per_user_limit ? Number(form.per_user_limit) : 1,
        valid_until:      form.valid_until || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error ?? "فشل إنشاء الكوبون");
    else { setForm(EMPTY); setShowForm(false); load(); }
    setSaving(false);
  };

  const toggleActive = async (id: string, val: boolean) => {
    const res = await fetch(`/api/admin/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: val }),
    });
    if (res.ok) setCoupons(prev => prev.map(c => c.id===id ? {...c, is_active:val} : c));
  };

  const deleteCoupon = async (id: string, code: string) => {
    if (!confirm(`حذف الكوبون "${code}"؟`)) return;
    const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    if (res.ok) setCoupons(prev => prev.filter(c => c.id !== id));
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const iCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-1)]">التسويق والكوبونات</h1>
          <p className="text-sm text-[var(--text-muted)]">{coupons.length} كوبون</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="btn-primary gap-2">
          <Plus size={16}/> إنشاء كوبون
        </button>
      </div>

      {/* نموذج الإنشاء */}
      {showForm && (
        <div className="card-base p-5 space-y-4">
          <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3">كوبون جديد</h2>
          {error && <p className="text-sm text-red-500">⚠ {error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">كود الكوبون *</label>
              <input type="text" dir="ltr" placeholder="SUMMER20" value={form.code}
                onChange={e=>setForm(f=>({...f,code:e.target.value.toUpperCase()}))} className={iCls}/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">نوع الخصم</label>
              <select value={form.discount_type} onChange={e=>setForm(f=>({...f,discount_type:e.target.value}))} className={iCls}>
                <option value="percentage">نسبة مئوية (%)</option>
                <option value="fixed">مبلغ ثابت (YER)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">قيمة الخصم *</label>
              <div className="relative">
                <input type="number" min="0" dir="ltr"
                  placeholder={form.discount_type==="percentage"?"10":"5000"}
                  value={form.discount_value}
                  onChange={e=>setForm(f=>({...f,discount_value:Number(e.target.value)}))} className={iCls+" pe-8"}/>
                <span className="absolute top-2.5 end-3 text-xs text-[var(--text-muted)]">
                  {form.discount_type==="percentage"?"%":"﷼"}
                </span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">حد أدنى للطلب (YER)</label>
              <input type="number" min="0" dir="ltr" placeholder="0" value={form.min_order_amount}
                onChange={e=>setForm(f=>({...f,min_order_amount:e.target.value}))} className={iCls}/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">أقصى عدد استخدامات إجمالي</label>
              <input type="number" min="1" dir="ltr" placeholder="غير محدود" value={form.max_uses}
                onChange={e=>setForm(f=>({...f,max_uses:e.target.value}))} className={iCls}/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">أقصى استخدام لكل عميل</label>
              <input type="number" min="1" dir="ltr" placeholder="1" value={form.per_user_limit}
                onChange={e=>setForm(f=>({...f,per_user_limit:e.target.value}))} className={iCls}/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">تاريخ الانتهاء</label>
              <input type="datetime-local" dir="ltr" value={form.valid_until}
                onChange={e=>setForm(f=>({...f,valid_until:e.target.value}))} className={iCls}/>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={handleCreate} disabled={saving}
              className="btn-primary gap-2">
              {saving ? <><Loader2 size={14} className="animate-spin"/> حفظ...</> : <><Plus size={14}/> إنشاء الكوبون</>}
            </button>
            <button onClick={()=>{setShowForm(false);setError("");}} className="btn-ghost border border-[var(--border)]">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* قائمة الكوبونات */}
      <div className="card-base overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-14 w-full"/>)}</div>
        ) : coupons.length === 0 ? (
          <div className="py-16 text-center">
            <Tag size={40} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]"/>
            <p className="text-[var(--text-muted)]">لا توجد كوبونات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-page)] border-b border-[var(--border)]">
                <tr>
                  {["الكود","النوع","القيمة","الاستخدام","الانتهاء","الحالة",""].map(h=>(
                    <th key={h} className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {coupons.map(c => {
                  const expired = c.valid_until && new Date(c.valid_until) < new Date();
                  const full    = c.max_uses !== null && c.current_uses >= c.max_uses;
                  return (
                    <tr key={c.id} className="hover:bg-[var(--bg-page)] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 text-brand-700 dark:text-accent-400 font-mono text-sm font-bold" dir="ltr">
                            {c.code}
                          </code>
                          <button onClick={() => copyCode(c.code)}
                            className="text-[var(--text-muted)] hover:text-brand-700 transition-colors">
                            {copied===c.code ? <CheckCircle size={13} className="text-green-500"/> : <Copy size={13}/>}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-2)]">
                        {c.discount_type==="percentage"?"نسبة":"مبلغ ثابت"}
                      </td>
                      <td className="px-4 py-3 font-bold text-brand-700 dark:text-accent-400" dir="ltr">
                        {c.discount_type==="percentage" ? `${c.discount_value}%` : `${c.discount_value.toLocaleString("ar")} ﷼`}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-2)]">
                        {c.current_uses}{c.max_uses ? ` / ${c.max_uses}` : ""}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                        {c.valid_until ? new Date(c.valid_until).toLocaleDateString("ar-YE") : "لا يوجد"}
                      </td>
                      <td className="px-4 py-3">
                        {expired || full ? (
                          <span className="badge text-xs bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 px-2.5 py-1">
                            {expired ? "منتهي" : "استُنفد"}
                          </span>
                        ) : (
                          <button onClick={() => toggleActive(c.id, !c.is_active)}
                            className={`badge text-xs px-2.5 py-1 cursor-pointer hover:opacity-80 transition-opacity ${
                              c.is_active
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                            }`}>
                            {c.is_active ? "نشط" : "معطّل"}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteCoupon(c.id, c.code)}
                          className="text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 size={14}/>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
