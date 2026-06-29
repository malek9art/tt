"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, Eye, EyeOff, Truck, UserPlus } from "lucide-react";

const YEMENI_GOVS = [
  "أمانة العاصمة","صنعاء","عدن","تعز","الحديدة","إب",
  "ذمار","حضرموت","شبوة","مأرب","حجة","صعدة","عمران","لحج",
];

const VEHICLES = [
  { value:"motorcycle", label:"دراجة نارية 🏍️" },
  { value:"car",        label:"سيارة 🚗" },
  { value:"bicycle",    label:"دراجة هوائية 🚲" },
  { value:"walking",    label:"مشياً 🚶" },
];

export default function NewDriverPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);
  const [error,   setError]   = useState("");
  const [form, setForm] = useState({
    full_name:     "",
    email:         "",
    phone:         "",
    password:      "",
    vehicle_type:  "motorcycle",
    coverage_zone: "تعز",
    max_orders:    5,
    notes:         "",
  });

  const setF = (k: string, v: unknown) => { setForm(f=>({...f,[k]:v})); setError(""); };

  const handleCreate = async () => {
    if (!form.full_name.trim()) { setError("أدخل الاسم الكامل"); return; }
    if (!form.email.includes("@")) { setError("بريد إلكتروني غير صحيح"); return; }
    if (!form.phone.trim()) { setError("أدخل رقم الهاتف"); return; }
    if (form.password.length < 8) { setError("كلمة المرور 8 أحرف على الأقل"); return; }

    setLoading(true); setError("");
    const res = await fetch("/api/admin/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    if (!res.ok || d.error) { setError(d.error ?? "خطأ في الإنشاء"); setLoading(false); return; }
    router.replace("/admin/drivers");
  };

  const iCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/drivers" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-2)] hover:border-brand-300 transition-colors">
          <ArrowRight size={16}/>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">إضافة مندوب جديد</h1>
          <p className="text-xs text-[var(--text-muted)]">سيتم إنشاء حساب للمندوب تلقائياً</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600">
          ⚠ {error}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {/* البيانات الشخصية */}
        <div className="card-base p-5 space-y-4 md:col-span-2">
          <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3 flex items-center gap-2">
            <UserPlus size={16} className="text-brand-700"/> البيانات الشخصية
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الاسم الكامل *</label>
              <input type="text" placeholder="محمد علي أحمد" value={form.full_name}
                onChange={e=>setF("full_name",e.target.value)} className={iCls}/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">رقم الهاتف *</label>
              <input type="tel" dir="ltr" placeholder="00967-7XXXXXXXX" value={form.phone}
                onChange={e=>setF("phone",e.target.value)} className={iCls}/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">البريد الإلكتروني *</label>
              <input type="email" dir="ltr" placeholder="driver@ahmadi.ye" value={form.email}
                onChange={e=>setF("email",e.target.value)} className={iCls}/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">كلمة المرور * (8 أحرف+)</label>
              <div className="relative">
                <input type={showPw?"text":"password"} dir="ltr" placeholder="••••••••••" value={form.password}
                  onChange={e=>setF("password",e.target.value)} className={iCls+" ps-9"}/>
                <button type="button" onClick={()=>setShowPw(!showPw)}
                  className="absolute top-2.5 start-3 text-[var(--text-muted)] hover:text-[var(--text-1)] transition-colors">
                  {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* بيانات التوصيل */}
        <div className="card-base p-5 space-y-4">
          <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3 flex items-center gap-2">
            <Truck size={16} className="text-brand-700"/> بيانات التوصيل
          </h2>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">وسيلة التوصيل</label>
            <select value={form.vehicle_type} onChange={e=>setF("vehicle_type",e.target.value)} className={iCls}>
              {VEHICLES.map(v=><option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">منطقة التغطية</label>
            <select value={form.coverage_zone} onChange={e=>setF("coverage_zone",e.target.value)} className={iCls}>
              {YEMENI_GOVS.map(g=><option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">
              الحد الأقصى للطلبات المتزامنة
            </label>
            <input type="number" min="1" max="20" dir="ltr" value={form.max_orders}
              onChange={e=>setF("max_orders",Number(e.target.value))} className={iCls}/>
          </div>
        </div>

        {/* ملاحظات */}
        <div className="card-base p-5 space-y-4">
          <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3">ملاحظات</h2>
          <textarea rows={5} value={form.notes} onChange={e=>setF("notes",e.target.value)}
            placeholder="أي ملاحظات عن المندوب، المناطق التي يغطيها، أوقات عمله..."
            className={iCls+" resize-none"}/>
        </div>
      </div>

      <button onClick={handleCreate} disabled={loading}
        className="btn-primary w-full justify-center text-base py-3">
        {loading
          ? <><Loader2 size={16} className="animate-spin"/> جارٍ الإنشاء...</>
          : <><UserPlus size={16}/> إنشاء حساب المندوب</>}
      </button>

      <div className="rounded-lg border border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-900/20 p-3 text-xs text-brand-700 dark:text-brand-300">
        ℹ يمكن للمندوب الدخول فوراً عبر <strong>/driver/login</strong> بالبريد وكلمة المرور المحددة
      </div>
    </div>
  );
}
