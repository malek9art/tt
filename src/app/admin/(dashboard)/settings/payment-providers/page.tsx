"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PROVIDERS = [
  { key:"cod",      name:"الدفع عند الاستلام (COD)", icon:"💵",
    desc:"يدفع العميل عند استلام الطلب",       free:true },
  { key:"jawali",   name:"جوالي",                     icon:"📱",
    desc:"المحفظة الإلكترونية اليمنية الأولى",  free:false },
  { key:"floosak",  name:"فلوسك",                    icon:"💳",
    desc:"خدمة الدفع الإلكتروني اليمنية",       free:false },
  { key:"stripe",   name:"Stripe",                   icon:"💳",
    desc:"بطاقات ائتمانية دولية (Visa/Master)",  free:false },
];

export default function PaymentProvidersPage() {
  const [active,   setActive]   = useState<Record<string,boolean>>({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState<string|null>(null);

  useEffect(() => {
    sb.from("settings")
      .select("key, value")
      .like("key", "payment.%")
      .then(({ data }) => {
        const map: Record<string,boolean> = {};
        (data ?? []).forEach(s => {
          const k = s.key.replace("payment.", "");
          const v = typeof s.value === "string" ? s.value : JSON.stringify(s.value);
          map[k] = v === "true" || v === "\"true\"";
        });
        // COD مفعّل افتراضياً
        if (map["cod"] === undefined) map["cod"] = true;
        setActive(map);
        setLoading(false);
      });
  }, []);

  const toggle = async (key: string) => {
    setSaving(key);
    const newVal = !active[key];
    await sb.from("settings").upsert(
      { key: `payment.${key}`, value: JSON.stringify(newVal), scope: "global", is_public: false },
      { onConflict: "key" }
    );
    setActive(prev => ({ ...prev, [key]: newVal }));
    setSaving(null);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-1)]">وسائل الدفع</h1>
        <p className="text-sm text-[var(--text-muted)]">فعّل أو عطّل طرق الدفع المتاحة للعملاء</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i=><div key={i} className="skeleton h-20 w-full rounded-xl"/>)}</div>
      ) : (
        <div className="space-y-3">
          {PROVIDERS.map(p => (
            <div key={p.key} className={`card-base p-5 flex items-center justify-between gap-4 transition-all ${
              active[p.key] ? "border-brand-200 dark:border-brand-700" : ""
            }`}>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bg-page)] text-2xl shrink-0">
                  {p.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[var(--text-1)]">{p.name}</p>
                    {p.free && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        مجاني
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{p.desc}</p>
                </div>
              </div>
              <button onClick={() => toggle(p.key)} disabled={saving === p.key}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  active[p.key]
                    ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 hover:bg-red-50 hover:text-red-600"
                    : "bg-[var(--border)] text-[var(--text-2)] hover:bg-brand-700 hover:text-white"
                }`}>
                {saving === p.key
                  ? <Loader2 size={14} className="animate-spin"/>
                  : active[p.key]
                    ? <><CheckCircle size={14}/> مفعّل</>
                    : <><XCircle size={14}/> معطّل</>}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 p-4 text-sm text-blue-700 dark:text-blue-300">
        ℹ الدفع عند الاستلام (COD) هو الطريقة الافتراضية ويُنصح بإبقائه مفعّلاً دائماً.
        وسائل الدفع الأخرى تتطلب إعداد حسابات خاصة.
      </div>
    </div>
  );
}
