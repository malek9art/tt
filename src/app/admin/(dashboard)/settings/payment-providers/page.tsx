"use client";
import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  HiCheckCircle, HiXCircle, HiArrowPath, HiCog6Tooth, HiXMark,
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

// Config fields per provider type
const CONFIG_FIELDS: Record<string, Array<{ key: string; label: string; placeholder?: string; multiline?: boolean }>> = {
  manual_wallet: [
    { key: "account_number", label: "رقم المحفظة", placeholder: "7X XXXXXXXX" },
    { key: "account_name",   label: "اسم صاحب المحفظة", placeholder: "أحمد محمد" },
  ],
  bank_transfer: [
    { key: "account_number", label: "رقم الحساب البنكي", placeholder: "XXXX XXXX XXXX" },
    { key: "account_name",   label: "اسم صاحب الحساب", placeholder: "مركز الأحمدي للجوالات" },
    { key: "bank_name",      label: "اسم البنك",        placeholder: "البنك الأهلي اليمني" },
  ],
  transfer_point: [],
  stripe: [],
  cod:    [],
};

export default function PaymentProvidersPage() {
  const [providers, setProviders]  = useState<Provider[]>([]);
  const [loading,   setLoading]    = useState(true);
  const [saving,    setSaving]     = useState<string | null>(null);
  const [editModal, setEditModal]  = useState<Provider | null>(null);
  const [cfg,       setCfg]        = useState<Record<string, string>>({});
  const [cfgSaving, setCfgSaving]  = useState(false);

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
    const res = await fetch(`/api/admin/settings/payment-providers/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !p.is_active }),
    });
    if (res.ok) {
      setProviders(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x));
    }
    setSaving(null);
  };

  const toggleTestMode = async (p: Provider) => {
    setSaving(p.id + "_test");
    const res = await fetch(`/api/admin/settings/payment-providers/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_test_mode: !p.is_test_mode }),
    });
    if (res.ok) {
      setProviders(prev => prev.map(x => x.id === p.id ? { ...x, is_test_mode: !x.is_test_mode } : x));
    }
    setSaving(null);
  };

  const openEdit = (p: Provider) => {
    setCfg({ ...(p.config ?? {}) });
    setEditModal(p);
  };

  const saveConfig = async () => {
    if (!editModal) return;
    setCfgSaving(true);
    const res = await fetch(`/api/admin/settings/payment-providers/${editModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: cfg }),
    });
    if (res.ok) {
      setProviders(prev => prev.map(x => x.id === editModal.id ? { ...x, config: cfg } : x));
      setEditModal(null);
    }
    setCfgSaving(false);
  };

  const editableType = (p: Provider) => {
    const type = p.metadata?.type ?? "";
    return CONFIG_FIELDS[type] && CONFIG_FIELDS[type].length > 0;
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-1)]">وسائل الدفع</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">فعّل أو عطّل طرق الدفع وأعدّ بياناتها</p>
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

                      {/* Config preview */}
                      {p.is_active && p.config?.account_number && (
                        <p className="text-xs text-[var(--text-2)] mt-1 font-mono" dir="ltr">
                          {p.config.account_number}
                          {p.config.account_name && ` · ${p.config.account_name}`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {/* Config edit button */}
                    {editableType(p) && (
                      <button onClick={() => openEdit(p)}
                        className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-2)] hover:border-brand-500 hover:text-brand-700 transition-colors">
                        <HiCog6Tooth className="text-sm"/> إعداد
                      </button>
                    )}
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

                {/* Transfer-point hint */}
                {type === "transfer_point" && p.is_active && (
                  <p className="mt-3 text-xs text-[var(--text-muted)] border-t border-[var(--border)] pt-3">
                    نقاط التحويل تُدار من{" "}
                    <a href="/admin/settings/transfer-points" className="text-brand-700 dark:text-accent-400 underline font-medium">
                      صفحة نقاط التحويل
                    </a>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 p-4 text-sm text-blue-700 dark:text-blue-300">
        ℹ مفاتيح API كـ Stripe Secret تُوضع في متغيرات البيئة (Vercel → Settings → Environment Variables) ولا تُخزَّن هنا.
      </div>

      {/* Config Edit Modal */}
      {editModal && (() => {
        const type   = editModal.metadata?.type ?? "";
        const fields = CONFIG_FIELDS[type] ?? [];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditModal(null)}/>
            <div className="relative w-full max-w-md rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[var(--text-1)]">
                  إعداد {editModal.metadata?.name_ar ?? editModal.name}
                </h3>
                <button onClick={() => setEditModal(null)} className="text-[var(--text-muted)] hover:text-[var(--text-1)]">
                  <HiXMark className="text-xl"/>
                </button>
              </div>

              <div className="space-y-3">
                {fields.map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-[var(--text-2)] block mb-1.5">{f.label}</label>
                    <input
                      type="text"
                      dir="ltr"
                      placeholder={f.placeholder}
                      value={cfg[f.key] ?? ""}
                      onChange={e => setCfg(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-brand-500"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setEditModal(null)}
                  className="btn-ghost border border-[var(--border)] flex-1 justify-center">
                  إلغاء
                </button>
                <button onClick={saveConfig} disabled={cfgSaving}
                  className="btn-primary flex-1 justify-center gap-2">
                  <HiCheckCircle className="text-base"/> {cfgSaving ? "جاري الحفظ..." : "حفظ"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
