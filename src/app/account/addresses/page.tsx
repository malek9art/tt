"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useAuthStore } from "@/store/authStore";
import { MapPin, Plus, Trash2, Star, Loader2 } from "lucide-react";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const GOVS = ["تعز","صنعاء","عدن","الحديدة","إب","ذمار","البيضاء","المحويت","حجة","المهرة","لحج","أبين","شبوة","مأرب","الجوف","عمران","ريمة","الضالع","سقطرى"];

interface Address { id:string; label:string|null; governorate:string; district:string|null; street:string|null; landmark:string|null; is_default:boolean; }

export default function AddressesPage() {
  const { user }       = useAuthStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [form, setForm] = useState({ label:"", governorate:"تعز", district:"", street:"", landmark:"", is_default:false });

  const load = async () => {
    if (!user) return;
    const { data } = await sb.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending:false });
    setAddresses(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleSave = async () => {
    if (!user || !form.governorate) return;
    setSaving(true);
    if (form.is_default) {
      await sb.from("addresses").update({ is_default:false }).eq("user_id", user.id);
    }
    await sb.from("addresses").insert({
      user_id:    user.id,
      label:      form.label || null,
      governorate:form.governorate,
      district:   form.district || null,
      street:     form.street   || null,
      landmark:   form.landmark || null,
      is_default: form.is_default,
    });
    setForm({ label:"", governorate:"تعز", district:"", street:"", landmark:"", is_default:false });
    setShowForm(false);
    setSaving(false);
    load();
  };

  const setDefault = async (id: string) => {
    if (!user) return;
    await sb.from("addresses").update({ is_default:false }).eq("user_id", user.id);
    await sb.from("addresses").update({ is_default:true  }).eq("id", id);
    load();
  };

  const deleteAddr = async (id: string) => {
    await sb.from("addresses").delete().eq("id", id);
    setAddresses(a => a.filter(x => x.id !== id));
  };

  const iCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--text-1)]">عناوين التوصيل</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary gap-2">
          <Plus size={15}/> إضافة عنوان
        </button>
      </div>

      {/* نموذج إضافة */}
      {showForm && (
        <div className="card-base p-5 space-y-4">
          <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3">عنوان جديد</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">تسمية (منزل، عمل...)</label>
              <input type="text" value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))} className={iCls} placeholder="منزل"/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">المحافظة *</label>
              <select value={form.governorate} onChange={e=>setForm(f=>({...f,governorate:e.target.value}))} className={iCls}>
                {GOVS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">المديرية / الحي</label>
              <input type="text" value={form.district} onChange={e=>setForm(f=>({...f,district:e.target.value}))} className={iCls} placeholder="المديرية أو الحي"/>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الشارع / المبنى</label>
              <input type="text" value={form.street} onChange={e=>setForm(f=>({...f,street:e.target.value}))} className={iCls} placeholder="اسم الشارع ورقم المبنى"/>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">علامة مميزة</label>
              <input type="text" value={form.landmark} onChange={e=>setForm(f=>({...f,landmark:e.target.value}))} className={iCls} placeholder="بجوار مسجد / خلف مدرسة..."/>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_default} onChange={e=>setForm(f=>({...f,is_default:e.target.checked}))} className="h-4 w-4 rounded text-brand-700"/>
            <span className="text-sm text-[var(--text-1)]">تعيين كعنوان افتراضي</span>
          </label>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="btn-ghost border border-[var(--border)] flex-1">إلغاء</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? <Loader2 size={15} className="animate-spin"/> : "حفظ العنوان"}
            </button>
          </div>
        </div>
      )}

      {/* قائمة العناوين */}
      {loading ? (
        <div className="space-y-3">{[1,2].map(i=><div key={i} className="skeleton h-24 rounded-xl"/>)}</div>
      ) : addresses.length === 0 ? (
        <div className="card-base py-16 text-center">
          <MapPin size={40} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]"/>
          <p className="font-semibold text-[var(--text-1)]">لا توجد عناوين محفوظة</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">أضف عنواناً لتسريع عملية الشراء</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map(addr => (
            <div key={addr.id} className={`card-base p-4 flex items-start gap-4 ${addr.is_default ? "border-brand-300 dark:border-brand-600" : ""}`}>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${addr.is_default ? "bg-brand-100 dark:bg-brand-900/40 text-brand-700" : "bg-[var(--bg-page)] text-[var(--text-muted)]"}`}>
                <MapPin size={18}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {addr.label && <span className="text-sm font-semibold text-[var(--text-1)]">{addr.label}</span>}
                  {addr.is_default && <span className="badge bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-accent-400 text-[10px] px-2">افتراضي</span>}
                </div>
                <p className="text-sm text-[var(--text-2)]">
                  {addr.governorate}{addr.district ? ` · ${addr.district}` : ""}
                </p>
                {addr.street && <p className="text-sm text-[var(--text-muted)]">{addr.street}</p>}
                {addr.landmark && <p className="text-xs text-[var(--text-muted)] mt-0.5">📍 {addr.landmark}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                {!addr.is_default && (
                  <button onClick={() => setDefault(addr.id)} title="تعيين كافتراضي"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-accent-500 hover:bg-[var(--border)] transition-colors">
                    <Star size={15}/>
                  </button>
                )}
                <button onClick={() => deleteAddr(addr.id)} title="حذف"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 size={15}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
