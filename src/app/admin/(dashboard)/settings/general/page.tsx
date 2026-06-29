"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Save, Loader2, CheckCircle } from "lucide-react";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Setting { key: string; value: string; label: string; type?: string; }

const SETTINGS: Setting[] = [
  { key:"store_name",      value:"", label:"اسم المتجر" },
  { key:"store_phone",     value:"", label:"رقم التواصل" },
  { key:"store_address",   value:"", label:"العنوان" },
  { key:"store_email",     value:"", label:"البريد الإلكتروني" },
  { key:"currency",        value:"", label:"العملة" },
  { key:"min_order_amount",value:"", label:"الحد الأدنى للطلب (YER)" },
  { key:"free_shipping_threshold", value:"", label:"حد الشحن المجاني (YER)" },
];

export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState<Record<string,string>>({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  useEffect(() => {
    sb.from("settings").select("key, value").then(({ data }) => {
      const map: Record<string,string> = {};
      (data ?? []).forEach(s => { map[s.key] = s.value ?? ""; });
      setSettings(map);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const updates = SETTINGS.map(s => ({
      key: s.key,
      value: settings[s.key] ?? "",
    }));
    for (const u of updates) {
      await sb.from("settings")
        .upsert({ key: u.key, value: u.value }, { onConflict: "key" });
    }
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const iCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold text-[var(--text-1)]">الإعدادات العامة</h1>

      <div className="card-base p-6 space-y-4">
        {loading ? (
          <div className="space-y-3">{[1,2,3,4].map(i=><div key={i} className="skeleton h-10 w-full"/>)}</div>
        ) : (
          SETTINGS.map(s => (
            <div key={s.key}>
              <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">{s.label}</label>
              <input
                type={s.type ?? "text"}
                value={settings[s.key] ?? ""}
                onChange={e => setSettings(p => ({ ...p, [s.key]: e.target.value }))}
                className={iCls}
              />
            </div>
          ))
        )}
        <button onClick={handleSave} disabled={saving || loading}
          className={`w-full justify-center mt-2 ${saved ? "btn-ghost border border-green-400 text-green-600" : "btn-primary"}`}>
          {saving  ? <><Loader2 size={15} className="animate-spin"/> حفظ...</>
           : saved  ? <><CheckCircle size={15}/> تم الحفظ</>
           :          <><Save size={15}/> حفظ الإعدادات</>}
        </button>
      </div>
    </div>
  );
}
