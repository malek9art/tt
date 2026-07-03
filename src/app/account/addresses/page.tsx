"use client";
import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { Plus, Trash2, MapPin, ChevronLeft, Loader2, Star } from "lucide-react";
import LocationPicker, { type GeoPoint } from "@/components/map/LocationPicker";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const YEMENI_GOVS = [
  "أمانة العاصمة","صنعاء","عدن","تعز","الحديدة","إب","ذمار","حضرموت",
  "شبوة","مأرب","الجوف","البيضاء","ريمة","المحويت","حجة","صعدة",
  "عمران","لحج","أبين","الضالع","المهرة","سقطرى",
];

interface Address {
  id: string;
  label: string | null;
  full_name: string;
  phone: string;
  governorate: string;
  district: string | null;
  street: string | null;
  landmark: string | null;
  is_default: boolean;
  geo_lat: number | null;
  geo_lng: number | null;
}

const EMPTY_FORM = {
  label:"", full_name:"", phone:"", governorate:"تعز",
  district:"", street:"", landmark:"", is_default:false,
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [userId,    setUserId]    = useState<string|null>(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [geo,       setGeo]       = useState<GeoPoint|null>(null);
  const [error,     setError]     = useState("");

  const load = useCallback(async (uid: string) => {
    const { data } = await sb.from("addresses").select("*")
      .eq("user_id", uid).order("is_default", { ascending: false });
    setAddresses(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      load(user.id);
    });
  }, [load]);

  const handleSave = async () => {
    if (!userId) return;
    if (!form.full_name.trim()) { setError("أدخل الاسم"); return; }
    if (!form.phone.trim())     { setError("أدخل رقم الهاتف"); return; }
    setSaving(true); setError("");

    if (form.is_default) {
      await sb.from("addresses").update({ is_default: false }).eq("user_id", userId);
    }

    const { error: dbErr } = await sb.from("addresses").insert({
      user_id: userId, ...form,
      label:    form.label || null,
      district: form.district || null,
      street:   form.street  || null,
      landmark: form.landmark || null,
      geo_lat:  geo?.lat ?? null,
      geo_lng:  geo?.lng ?? null,
    });
    if (dbErr) setError(dbErr.message);
    else { setForm(EMPTY_FORM); setGeo(null); setShowForm(false); load(userId); }
    setSaving(false);
  };

  const deleteAddr = async (id: string) => {
    if (!confirm("حذف هذا العنوان؟")) return;
    await sb.from("addresses").delete().eq("id", id);
    setAddresses(prev => prev.filter(a => a.id !== id));
  };

  const setDefault = async (id: string) => {
    if (!userId) return;
    await sb.from("addresses").update({ is_default: false }).eq("user_id", userId);
    await sb.from("addresses").update({ is_default: true }).eq("id", id);
    setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id })));
  };

  const iCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container-main py-8 max-w-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/account" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-2)] hover:border-brand-300 transition-colors">
              <ChevronLeft size={16}/>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-1)]">عناوين التوصيل</h1>
              <p className="text-xs text-[var(--text-muted)]">{addresses.length} عنوان محفوظ</p>
            </div>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary gap-1.5 text-sm">
            <Plus size={15}/> إضافة
          </button>
        </div>

        {/* نموذج الإضافة */}
        {showForm && (
          <div className="card-base p-5 space-y-4 mb-4">
            <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3">عنوان جديد</h2>
            {error && <p className="text-sm text-red-500">⚠ {error}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">تسمية (اختياري)</label>
                <input type="text" placeholder="المنزل / العمل..." value={form.label}
                  onChange={e=>setForm(f=>({...f,label:e.target.value}))} className={iCls}/>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الاسم الكامل *</label>
                <input type="text" value={form.full_name}
                  onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} className={iCls}/>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">رقم الهاتف *</label>
                <input type="tel" dir="ltr" value={form.phone}
                  onChange={e=>setForm(f=>({...f,phone:e.target.value}))} className={iCls}/>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">المحافظة</label>
                <select value={form.governorate} onChange={e=>setForm(f=>({...f,governorate:e.target.value}))} className={iCls}>
                  {YEMENI_GOVS.map(g=><option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">المديرية / الحي</label>
                <input type="text" value={form.district}
                  onChange={e=>setForm(f=>({...f,district:e.target.value}))} className={iCls}/>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الشارع / العنوان التفصيلي</label>
                <input type="text" value={form.street}
                  onChange={e=>setForm(f=>({...f,street:e.target.value}))} className={iCls}/>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">علامة مميزة (اختياري)</label>
                <input type="text" placeholder="بجانب مسجد / أمام المدرسة..." value={form.landmark}
                  onChange={e=>setForm(f=>({...f,landmark:e.target.value}))} className={iCls}/>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">
                  📍 الموقع على الخريطة (اختياري)
                </label>
                <LocationPicker value={geo} onChange={setGeo}/>
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_default}
                    onChange={e=>setForm(f=>({...f,is_default:e.target.checked}))}
                    className="h-4 w-4 rounded text-brand-700"/>
                  <span className="text-sm text-[var(--text-1)]">تعيين كعنوان افتراضي</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={saving} className="btn-primary gap-2">
                {saving ? <><Loader2 size={14} className="animate-spin"/> حفظ...</> : <><Plus size={14}/> حفظ العنوان</>}
              </button>
              <button onClick={()=>{setShowForm(false);setError("");}} className="btn-ghost border border-[var(--border)]">إلغاء</button>
            </div>
          </div>
        )}

        {/* قائمة العناوين */}
        {loading ? (
          <div className="space-y-3">{[1,2].map(i=><div key={i} className="skeleton h-28 w-full rounded-xl"/>)}</div>
        ) : addresses.length === 0 ? (
          <div className="card-base py-16 text-center">
            <MapPin size={40} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]"/>
            <p className="font-semibold text-[var(--text-1)] mb-1">لا توجد عناوين</p>
            <p className="text-sm text-[var(--text-muted)]">أضف عنوان توصيل لتسريع عملية الطلب</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map(addr => (
              <div key={addr.id} className={`card-base p-4 transition-all ${
                addr.is_default ? "border-brand-300 dark:border-brand-600" : ""
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      addr.is_default ? "bg-brand-700 text-white" : "bg-brand-50 dark:bg-brand-900/30 text-brand-700"
                    }`}>
                      <MapPin size={16}/>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {addr.label && <span className="text-xs font-medium text-brand-700 dark:text-accent-400">{addr.label}</span>}
                        {addr.is_default && (
                          <span className="flex items-center gap-0.5 text-[10px] text-accent-600 dark:text-accent-400 font-medium">
                            <Star size={10} className="fill-current"/> افتراضي
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-[var(--text-1)]">{addr.full_name}</p>
                      <p className="text-sm text-[var(--text-2)]" dir="ltr">{addr.phone}</p>
                      <p className="text-sm text-[var(--text-muted)] mt-1">
                        {addr.governorate}{addr.district && ` · ${addr.district}`}
                        {addr.street && ` · ${addr.street}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {!addr.is_default && (
                      <button onClick={() => setDefault(addr.id)}
                        className="text-xs text-brand-700 hover:text-brand-900 transition-colors whitespace-nowrap">
                        تعيين افتراضياً
                      </button>
                    )}
                    <button onClick={() => deleteAddr(addr.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors flex items-center gap-1">
                      <Trash2 size={12}/> حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
