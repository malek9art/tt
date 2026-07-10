"use client";
import { useState, useEffect, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Image from "next/image";
import Link from "next/link";
import {
  Save, Loader2, CheckCircle, Upload, Store,
  Phone, Mail, MapPin, Globe, Instagram,
  MessageSquare, Clock, Trash2, ArrowRight
} from "lucide-react";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// تعريف الحقول مع مجموعاتها
const FIELDS = [
  // معلومات المتجر
  { key:"store.name",     label:"اسم المتجر",       icon:Store,         group:"store",    placeholder:"مركز الأحمدي للجوالات" },
  { key:"store.tagline",  label:"الشعار/الوصف",    icon:Store,         group:"store",    placeholder:"جوالك بأفضل الأسعار" },
  { key:"store.address",  label:"العنوان التفصيلي", icon:MapPin,        group:"store",    placeholder:"شارع تعز، أمام..." },
  { key:"store.governorate",label:"المحافظة",       icon:MapPin,        group:"store",    placeholder:"تعز" },
  // التواصل
  { key:"store.phone",    label:"رقم الهاتف",       icon:Phone,         group:"contact",  placeholder:"00967-777XXXXXX", dir:"ltr" },
  { key:"store.whatsapp", label:"واتساب",            icon:MessageSquare, group:"contact",  placeholder:"00967-777XXXXXX", dir:"ltr" },
  { key:"store.whatsapp_maintenance", label:"واتساب الصيانة", icon:MessageSquare, group:"contact",  placeholder:"00967-777XXXXXX (اختياري)", dir:"ltr" },
  { key:"store.email",    label:"البريد الإلكتروني",icon:Mail,          group:"contact",  placeholder:"info@ahmadi.ye",   dir:"ltr" },
  { key:"store.working_hours",label:"أوقات الدوام", icon:Clock,         group:"contact",  placeholder:"9 صباحاً - 9 مساءً" },
  // الشبكات الاجتماعية
  { key:"store.facebook",  label:"فيسبوك",           icon:Globe,         group:"social",   placeholder:"https://facebook.com/...", dir:"ltr" },
  { key:"store.instagram", label:"انستغرام",          icon:Instagram,     group:"social",   placeholder:"https://instagram.com/...", dir:"ltr" },
  { key:"store.twitter",   label:"تويتر / X",         icon:Globe,         group:"social",   placeholder:"https://x.com/...", dir:"ltr" },
  // الشحن والعملة
  { key:"shipping.free_above",  label:"حد الشحن المجاني (YER)", icon:Store, group:"finance", placeholder:"50000", dir:"ltr" },
  { key:"order.min_amount",     label:"الحد الأدنى للطلب (YER)",icon:Store, group:"finance", placeholder:"0",     dir:"ltr" },
];

const GROUP_LABELS: Record<string,string> = {
  store:   "معلومات المتجر",
  contact: "بيانات التواصل",
  social:  "الشبكات الاجتماعية",
  finance: "الشحن والمدفوعات",
};

export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState<Record<string,string>>({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState("");
  const [logoUrl,  setLogoUrl]  = useState<string>("");
  const [uploading,setUploading]= useState(false);
  const [userId,   setUserId]   = useState<string|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    sb.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));

    sb.from("settings").select("key, value").then(({ data }) => {
      const map: Record<string,string> = {};
      (data ?? []).forEach(s => {
        // value مخزّن كـ jsonb — نُزيل التقنيتين (") إن وُجدتا
        const raw = typeof s.value === "string" ? s.value : JSON.stringify(s.value);
        map[s.key] = raw.replace(/^"|"$/g, "");
      });
      setSettings(map);
      setLogoUrl(map["store.logo_url"] ?? "");
      setLoading(false);
    });
  }, []);

  const setVal = (key: string, val: string) =>
    setSettings(prev => ({ ...prev, [key]: val }));

  // رفع الشعار
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true); setError("");

    const ext  = file.name.split(".").pop() ?? "png";
    const path = `store/logo.${ext}`;

    const { error: upErr } = await sb.storage
      .from("assets")
      .upload(path, file, { upsert: true, cacheControl: "86400" });

    if (upErr) { setError("فشل رفع الشعار: " + upErr.message); setUploading(false); return; }

    const { data: { publicUrl } } = sb.storage.from("assets").getPublicUrl(path);
    const freshUrl = publicUrl + "?t=" + Date.now();
    setLogoUrl(freshUrl);
    setVal("store.logo_url", freshUrl);
    setUploading(false);
  };

  const removeLogo = async () => {
    await sb.storage.from("assets").remove(["store/logo.png", "store/logo.jpg", "store/logo.webp"]);
    setLogoUrl("");
    setVal("store.logo_url", "");
  };

  // حفظ الإعدادات
  const handleSave = async () => {
    setSaving(true); setError(""); setSaved(false);

    const allKeys = [...FIELDS.map(f => f.key), "store.logo_url"];
    for (const key of allKeys) {
      const val = settings[key] ?? "";
      const { error: dbErr } = await sb.from("settings")
        .upsert(
          { key, value: JSON.stringify(val), scope: "global", is_public: true, updated_by: userId },
          { onConflict: "key" }
        );
      if (dbErr) { setError("خطأ في الحفظ: " + dbErr.message); setSaving(false); return; }
    }
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const iCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  // تجميع الحقول حسب المجموعة
  const groups = Object.keys(GROUP_LABELS);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/settings"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-2)] hover:border-brand-300 transition-colors">
            <ArrowRight size={16}/>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-1)]">الإعدادات العامة</h1>
            <p className="text-sm text-[var(--text-muted)]">بيانات المتجر ومعلومات التواصل</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className={`gap-2 ${saved ? "btn-ghost border border-green-400 text-green-600" : "btn-primary"}`}>
          {saving  ? <><Loader2 size={15} className="animate-spin"/> جارٍ الحفظ...</>
           : saved ? <><CheckCircle size={15}/> تم الحفظ!</>
           :         <><Save size={15}/> حفظ الإعدادات</>}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600">
          ⚠ {error}
        </div>
      )}

      {/* ===== قسم الشعار ===== */}
      <div className="card-base p-6">
        <h2 className="mb-4 font-semibold text-[var(--text-1)] flex items-center gap-2 border-b border-[var(--border)] pb-3">
          <Store size={16} className="text-brand-700"/> شعار المتجر
        </h2>

        <div className="flex items-center gap-5 flex-wrap">
          {/* معاينة الشعار */}
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-page)]">
            {logoUrl ? (
              <>
                <Image src={logoUrl} alt="شعار المتجر" fill sizes="96px" className="object-contain p-2"/>
                <button
                  onClick={removeLogo}
                  className="absolute -top-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600 transition-colors">
                  <Trash2 size={11}/>
                </button>
              </>
            ) : (
              <Store size={28} className="text-[var(--text-muted)] opacity-40"/>
            )}
          </div>

          {/* أزرار الرفع */}
          <div className="flex-1 min-w-48">
            <p className="text-sm font-medium text-[var(--text-1)] mb-1">
              {logoUrl ? "تغيير الشعار" : "رفع شعار المتجر"}
            </p>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              PNG أو JPG أو WebP — يُفضّل خلفية شفافة · حجم أقصى 2MB
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="btn-primary gap-2 text-sm">
                {uploading
                  ? <><Loader2 size={14} className="animate-spin"/> جارٍ الرفع...</>
                  : <><Upload size={14}/> {logoUrl ? "تغيير الشعار" : "رفع الشعار"}</>}
              </button>
              {logoUrl && (
                <button onClick={removeLogo} className="btn-ghost border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm gap-1.5">
                  <Trash2 size={13}/> حذف
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>
        </div>
      </div>

      {/* ===== مجموعات الحقول ===== */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-12 w-full rounded-lg"/>)}
        </div>
      ) : (
        groups.map(group => {
          const groupFields = FIELDS.filter(f => f.group === group);
          if (!groupFields.length) return null;
          return (
            <div key={group} className="card-base p-6 space-y-4">
              <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3 flex items-center gap-2">
                {group === "store"   && <Store size={15} className="text-brand-700"/>}
                {group === "contact" && <Phone size={15} className="text-brand-700"/>}
                {group === "social"  && <Globe size={15} className="text-brand-700"/>}
                {group === "finance" && <Save  size={15} className="text-brand-700"/>}
                {GROUP_LABELS[group]}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {groupFields.map(field => {
                  const Icon = field.icon;
                  return (
                    <div key={field.key}
                      className={field.key === "store.tagline" || field.key === "store.address" ? "sm:col-span-2" : ""}>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--text-2)]">
                        <Icon size={12} className="text-brand-700"/>
                        {field.label}
                      </label>
                      <input
                        type="text"
                        dir={field.dir ?? "rtl"}
                        placeholder={field.placeholder}
                        value={settings[field.key] ?? ""}
                        onChange={e => setVal(field.key, e.target.value)}
                        className={iCls}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* زر الحفظ السفلي */}
      {!loading && (
        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full justify-center py-3 text-base ${saved ? "btn-ghost border border-green-400 text-green-600" : "btn-primary"}`}>
          {saving  ? <><Loader2 size={16} className="animate-spin"/> جارٍ الحفظ...</>
           : saved ? <><CheckCircle size={16}/> تم حفظ الإعدادات بنجاح!</>
           :         <><Save size={16}/> حفظ جميع الإعدادات</>}
        </button>
      )}
    </div>
  );
}
