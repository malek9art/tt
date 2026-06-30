"use client";
import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  HiCheckCircle, HiXCircle, HiArrowPath,
} from "react-icons/hi2";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Provider {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  is_test_mode: boolean;
  display_order: number;
  metadata: {
    icon?: string; name_ar?: string; description?: string;
    type?: string; confirmation?: string;
  };
  config: Record<string, string>;
}

const CONFIRMATION_LABELS: Record<string, string> = {
  instant:     "تأكيد فوري",
  manual:      "تأكيد يدوي",
  webhook:     "Webhook",
  on_delivery: "عند الاستلام",
};

const TYPE_LABELS: Record<string, string> = {
  cod:           "نقداً",
  stripe:        "Stripe",
  manual_wallet: "محفظة يدوية",
  transfer_point:"نقطة تحويل",
  bank_transfer: "تحويل بنكي",
};

const PROVIDER_EMOJIS: Record<string, string> = {
  cod:"💵", stripe:"💳", jawali:"📱", jeeb:"📱",
  floosak:"💳", kuraimi:"🏦", qutaibi:"🏦",
  onecash:"💰", yemenmobile:"📱", bank:"🏦",
};

export default function PaymentProvidersPage() {
  const [providers, setProviders]  = useState<Provider[]>([]);
  const [loading,   setLoading]    = useState(true);
  const [saving,    setSaving]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await sb
      .from("payment_providers")
      .select("id, code, name, is_active, is_test_mode, display_order, metadata, config")
      .order("display_order");
    setProviders(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (p: Provider) => {
    setSaving(p.id);
    await sb.from("payment_providers")
      .update({ is_active: !p.is_active, updated_at: new Date().toISOString() })
      .eq("id", p.id);
    setProviders(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x));
    setSaving(null);
  };

  const toggleTestMode = async (p: Provider) => {
    setSaving(p.id + "_test");
    await sb.from("payment_providers")
      .update({ is_test_mode: !p.is_test_mode, updated_at: new Date().toISOString() })
      .eq("id", p.id);
    setProviders(prev => prev.map(x => x.id === p.id ? { ...x, is_test_mode: !x.is_test_mode } : x));
    setSaving(null);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-1)]">وسائل الدفع</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">فعّل أو عطّل طرق الدفع المتاحة للعملاء</p>
        </div>
        <button onClick={load} className="btn-ghost border border-[var(--border)] gap-2 flex items-center">
          <HiArrowPath className="text-base"/> تحديث
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-20 rounded-xl"/>)}</div>
      ) : (
        <div className="space-y-3">
          {providers.map(p => {
            const meta = p.metadata ?? {} as Provider["metadata"];
            const type = meta.type ?? "";
            const conf = meta.confirmation ?? "";
            return (
              <div key={p.id} className={`card-base p-5 transition-all ${p.is_active ? "border-brand-200 dark:border-brand-700" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bg-page)] text-2xl shrink-0">
                      {PROVIDER_EMOJIS[p.code] ?? "💰"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-[var(--text-1)]">{meta.name_ar ?? p.name}</p>
                        {type && (
                          <span className="text-[10px] rounded-full bg-[var(--border)] text-[var(--text-2)] px-1.5 py-0.5">
                            {TYPE_LABELS[type] ?? type}
                          </span>
                        )}
                        {conf && (
                          <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${
                            conf === "instant" ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            : conf === "manual" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                          }`}>
                            {CONFIRMATION_LABELS[conf] ?? conf}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{meta.description ?? ""}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Test mode toggle */}
                    {p.code !== "cod" && (
                      <button onClick={() => toggleTestMode(p)}
                        disabled={saving === p.id + "_test"}
                        className={`text-[10px] rounded-lg px-2 py-1 font-medium border transition-all ${
                          p.is_test_mode
                            ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                            : "border-[var(--border)] text-[var(--text-muted)]"
                        }`}>
                        {p.is_test_mode ? "وضع الاختبار" : "مباشر"}
                      </button>
                    )}
                    {/* Active toggle */}
                    <button onClick={() => toggle(p)}
                      disabled={saving === p.id}
                      className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                        p.is_active
                          ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 hover:bg-red-50 hover:text-red-600"
                          : "bg-[var(--border)] text-[var(--text-2)] hover:bg-brand-700 hover:text-white"
                      }`}>
                      {saving === p.id
                        ? <span className="animate-spin text-xs">⏳</span>
                        : p.is_active
                          ? <><HiCheckCircle className="text-base"/> مفعّل</>
                          : <><HiXCircle className="text-base"/> معطّل</>}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 p-4 text-sm text-blue-700 dark:text-blue-300">
        ℹ لإضافة نقاط الكريمي والقطيبي والمحافظ اليدوية، فعّل المزود ثم توجّه إلى{" "}
        <a href="/admin/settings/transfer-points" className="underline font-medium">نقاط التحويل</a>{" "}
        لإدارة الأرقام.
      </div>
    </div>
  );
}
