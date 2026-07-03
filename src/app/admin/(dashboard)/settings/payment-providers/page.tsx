"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";
import {
  HiCheckCircle, HiXCircle, HiArrowPath, HiCog6Tooth, HiXMark,
  HiPlus, HiTrash, HiPhoto, HiDevicePhoneMobile, HiBuildingLibrary,
  HiMapPin, HiCreditCard, HiBanknotes,
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
  min_amount: number | null;
  max_amount: number | null;
  metadata: {
    icon?: string; name_ar?: string; description?: string;
    type?: string; confirmation?: string; logo_url?: string; custom?: boolean;
  };
  config: Record<string, string>;
}

const CONFIRMATION_LABELS: Record<string, string> = {
  instant:     "تأكيد فوري",
  manual:      "تأكيد يدوي",
  webhook:     "Webhook",
  on_delivery: "عند الاستلام",
};

const PROVIDER_EMOJIS: Record<string, string> = {
  cod:"💵", stripe:"💳", jawali:"📱", jeeb:"📱",
  floosak:"💳", kuraimi:"🏦", qutaibi:"🏦",
  onecash:"💰", yemenmobile:"📱", bank:"🏦",
};

// Section definitions — order matters
const SECTIONS: Array<{
  key: string; title: string; desc: string;
  icon: React.ReactNode; types: string[]; addType?: string;
}> = [
  { key:"wallets", title:"المحافظ الإلكترونية", desc:"جوالي، فلوسك، وان كاش، يمن موبايل…",
    icon:<HiDevicePhoneMobile/>, types:["manual_wallet"], addType:"manual_wallet" },
  { key:"banks", title:"الحسابات البنكية", desc:"تحويل بنكي مباشر إلى حسابات المتجر",
    icon:<HiBuildingLibrary/>, types:["bank_transfer"], addType:"bank_transfer" },
  { key:"points", title:"شبكات ونقاط التحويل", desc:"حاسب الكريمي، شلن القطيبي — النقاط تُدار من صفحة نقاط التحويل",
    icon:<HiMapPin/>, types:["transfer_point"], addType:"transfer_point" },
  { key:"cards", title:"البطاقات الدولية", desc:"Stripe — يتطلب STRIPE_SECRET_KEY في متغيرات البيئة",
    icon:<HiCreditCard/>, types:["stripe"] },
  { key:"cod", title:"الدفع عند الاستلام", desc:"الدفع نقداً للمندوب عند التسليم",
    icon:<HiBanknotes/>, types:["cod"] },
];

const CONFIG_FIELDS: Record<string, Array<{ key: string; label: string; placeholder?: string }>> = {
  manual_wallet: [
    { key: "account_name",       label: "اسم صاحب المحفظة", placeholder: "أحمد محمد" },
    { key: "wallet_phone",       label: "رقم الجوال/المحفظة (يظهر مع رمز QR)", placeholder: "7XXXXXXXX" },
    { key: "account_number_yer", label: "رقم المحفظة — ريال يمني (YER)", placeholder: "7XXXXXXXX" },
    { key: "account_number_sar", label: "رقم المحفظة — ريال سعودي (SAR)", placeholder: "7XXXXXXXX" },
    { key: "account_number_usd", label: "رقم المحفظة — دولار أمريكي (USD)", placeholder: "7XXXXXXXX" },
  ],
  bank_transfer: [
    { key: "bank_name",          label: "اسم البنك",        placeholder: "بنك الكريمي" },
    { key: "account_name",       label: "اسم صاحب الحساب", placeholder: "مركز الأحمدي للجوالات" },
    { key: "account_number_yer", label: "رقم الحساب — ريال يمني (YER)", placeholder: "XXXX XXXX" },
    { key: "account_number_sar", label: "رقم الحساب — ريال سعودي (SAR)", placeholder: "XXXX XXXX" },
    { key: "account_number_usd", label: "رقم الحساب — دولار أمريكي (USD)", placeholder: "XXXX XXXX" },
  ],
  transfer_point: [],
  stripe: [],
  cod:    [],
};

// حقول الرسوم — لكل الوسائل اليدوية
const FEE_FIELDS: Array<{ key: string; label: string; placeholder: string }> = [
  { key: "fee_percent", label: "نسبة رسوم المزود % (اختياري — للعرض فقط)", placeholder: "1.5" },
  { key: "fee_fixed",   label: "رسوم ثابتة ﷼ (اختياري — للعرض فقط)",       placeholder: "100" },
];
const MANUAL_TYPES = ["manual_wallet", "bank_transfer", "transfer_point"];

const ADD_TYPE_LABELS: Record<string, string> = {
  manual_wallet: "محفظة إلكترونية",
  bank_transfer: "حساب بنكي",
  transfer_point:"شبكة تحويل",
};

// ── Logo (image or emoji fallback) ──────────────────
function ProviderLogo({ p, size = 48 }: { p: Provider; size?: number }) {
  const logo = p.metadata?.logo_url;
  if (logo) {
    return (
      <div className="relative shrink-0 overflow-hidden rounded-xl bg-white border border-[var(--border)]"
        style={{ width: size, height: size }}>
        <Image src={logo} alt={p.metadata?.name_ar ?? p.name} fill className="object-contain p-1" unoptimized/>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center rounded-xl bg-[var(--bg-page)] text-2xl shrink-0"
      style={{ width: size, height: size }}>
      {PROVIDER_EMOJIS[p.code] ?? "💰"}
    </div>
  );
}

export default function PaymentProvidersPage() {
  const [providers, setProviders]  = useState<Provider[]>([]);
  const [loading,   setLoading]    = useState(true);
  const [saving,    setSaving]     = useState<string | null>(null);
  const [error,     setError]      = useState("");

  // Edit modal
  const [editModal, setEditModal]  = useState<Provider | null>(null);
  const [cfg,       setCfg]        = useState<Record<string, string>>({});
  const [editName,  setEditName]   = useState("");
  const [editDesc,  setEditDesc]   = useState("");
  const [logoFile,  setLogoFile]   = useState<File | null>(null);
  const [cfgSaving, setCfgSaving]  = useState(false);
  const [editMin,   setEditMin]    = useState("");
  const [editMax,   setEditMax]    = useState("");
  const [editOrder, setEditOrder]  = useState("");
  const [editInstr, setEditInstr]  = useState("");

  // Add modal
  const [addModal,  setAddModal]   = useState<string | null>(null); // provider type
  const [addName,   setAddName]    = useState("");
  const [addDesc,   setAddDesc]    = useState("");
  const [addCfg,    setAddCfg]     = useState<Record<string, string>>({});
  const [addLogo,   setAddLogo]    = useState<File | null>(null);
  const [addSaving, setAddSaving]  = useState(false);

  const editLogoRef = useRef<HTMLInputElement>(null);
  const addLogoRef  = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/settings/payment-providers");
    const d   = await res.json();
    setProviders(d.providers ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const uploadLogo = async (file: File, code: string): Promise<string | null> => {
    const ext  = file.name.split(".").pop() ?? "png";
    const path = `${code}-${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from("payment-logos").upload(path, file, {
      upsert: true, contentType: file.type,
    });
    if (upErr) return null;
    return sb.storage.from("payment-logos").getPublicUrl(path).data.publicUrl;
  };

  const patchProvider = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/settings/payment-providers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "فشل الحفظ");
      return null;
    }
    return res.json();
  };

  const toggle = async (p: Provider) => {
    setSaving(p.id);
    const d = await patchProvider(p.id, { is_active: !p.is_active });
    if (d) setProviders(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !p.is_active } : x));
    setSaving(null);
  };

  const toggleTestMode = async (p: Provider) => {
    setSaving(p.id + "_test");
    const d = await patchProvider(p.id, { is_test_mode: !p.is_test_mode });
    if (d) setProviders(prev => prev.map(x => x.id === p.id ? { ...x, is_test_mode: !p.is_test_mode } : x));
    setSaving(null);
  };

  const remove = async (p: Provider) => {
    if (!window.confirm(`حذف "${p.metadata?.name_ar ?? p.name}" نهائياً؟`)) return;
    setSaving(p.id);
    const res = await fetch(`/api/admin/settings/payment-providers/${p.id}`, { method: "DELETE" });
    if (res.ok) setProviders(prev => prev.filter(x => x.id !== p.id));
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? "فشل الحذف"); }
    setSaving(null);
  };

  // التعليمات تُخزَّن في config.instructions — سطر لكل خطوة
  const instructionsToText = (raw?: string): string => {
    if (!raw?.trim()) return "";
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.join("\n") : raw;
    } catch { return raw; }
  };

  const openEdit = (p: Provider) => {
    setCfg({ ...(p.config ?? {}) });
    setEditName(p.metadata?.name_ar ?? p.name);
    setEditDesc(p.metadata?.description ?? "");
    setEditMin(p.min_amount != null ? String(p.min_amount) : "");
    setEditMax(p.max_amount != null ? String(p.max_amount) : "");
    setEditOrder(String(p.display_order ?? 0));
    setEditInstr(instructionsToText(p.config?.instructions));
    setLogoFile(null);
    setEditModal(p);
  };

  const saveEdit = async () => {
    if (!editModal) return;
    setCfgSaving(true);
    let logoUrl: string | undefined;
    if (logoFile) logoUrl = (await uploadLogo(logoFile, editModal.code)) ?? undefined;

    const steps = editInstr.split("\n").map(s => s.trim()).filter(Boolean);
    const nextCfg = { ...cfg };
    if (steps.length > 0) nextCfg.instructions = JSON.stringify(steps);
    else delete nextCfg.instructions;

    const d = await patchProvider(editModal.id, {
      config: nextCfg,
      name_ar: editName,
      description: editDesc,
      min_amount:    editMin ? Number(editMin) : null,
      max_amount:    editMax ? Number(editMax) : null,
      display_order: editOrder ? Number(editOrder) : 0,
      ...(logoUrl ? { logo_url: logoUrl } : {}),
    });
    if (d) { await load(); setEditModal(null); }
    setCfgSaving(false);
  };

  const openAdd = (type: string) => {
    setAddName(""); setAddDesc(""); setAddCfg({}); setAddLogo(null);
    setAddModal(type);
  };

  const saveAdd = async () => {
    if (!addModal || !addName.trim()) { setError("اسم وسيلة الدفع مطلوب"); return; }
    setAddSaving(true);

    let logoUrl = "";
    if (addLogo) logoUrl = (await uploadLogo(addLogo, "custom")) ?? "";

    const res = await fetch("/api/admin/settings/payment-providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name_ar: addName.trim(),
        type: addModal,
        description: addDesc.trim(),
        logo_url: logoUrl,
        config: addCfg,
      }),
    });
    if (res.ok) { await load(); setAddModal(null); }
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? "فشل الإضافة"); }
    setAddSaving(false);
  };

  const grouped = (types: string[]) =>
    providers.filter(p => types.includes(p.metadata?.type ?? ""));

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-1)]">وسائل الدفع</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">إدارة كاملة لطرق الدفع: تفعيل، إعداد، إضافة وسائل جديدة</p>
        </div>
        <button onClick={load} className="btn-ghost border border-[var(--border)] gap-2 flex items-center">
          <HiArrowPath className="text-base"/> تحديث
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
          {error}
          <button onClick={() => setError("")}><HiXMark/></button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-xl"/>)}</div>
      ) : (
        SECTIONS.map(section => {
          const list = grouped(section.types);
          if (list.length === 0 && !section.addType) return null;
          return (
            <section key={section.key} className="space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-accent-400 text-lg">
                    {section.icon}
                  </span>
                  <div>
                    <h2 className="font-bold text-[var(--text-1)]">{section.title}</h2>
                    <p className="text-xs text-[var(--text-muted)]">{section.desc}</p>
                  </div>
                </div>
                {section.addType && (
                  <button onClick={() => openAdd(section.addType!)}
                    className="flex items-center gap-1.5 rounded-lg bg-brand-700 text-white px-3 py-1.5 text-xs font-semibold hover:bg-brand-800 transition-colors">
                    <HiPlus className="text-sm"/> إضافة
                  </button>
                )}
              </div>

              {list.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] py-3 text-center border border-dashed border-[var(--border)] rounded-xl">
                  لا توجد وسائل في هذه الفئة — اضغط "إضافة"
                </p>
              ) : (
                <div className="space-y-2.5">
                  {list.map(p => {
                    const meta = p.metadata ?? {} as Provider["metadata"];
                    const conf = meta.confirmation ?? "";
                    const fields = CONFIG_FIELDS[meta.type ?? ""] ?? [];
                    return (
                      <div key={p.id} className={`card-base p-4 transition-all ${p.is_active ? "border-brand-200 dark:border-brand-700" : "opacity-80"}`}>
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <ProviderLogo p={p}/>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-[var(--text-1)]">{meta.name_ar ?? p.name}</p>
                                {conf && (
                                  <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${
                                    conf === "instant" ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                    : conf === "manual" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                  }`}>
                                    {CONFIRMATION_LABELS[conf] ?? conf}
                                  </span>
                                )}
                                {meta.custom && (
                                  <span className="text-[10px] rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 px-1.5 py-0.5">
                                    مخصص
                                  </span>
                                )}
                              </div>
                              {meta.description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{meta.description}</p>}
                              {(p.config?.account_number_yer || p.config?.account_number_sar || p.config?.account_number_usd || p.config?.account_number) && (
                                <div className="text-xs text-[var(--text-2)] mt-1 font-mono space-y-0.5" dir="ltr">
                                  {p.config.account_number     && <p>{p.config.account_number}</p>}
                                  {p.config.account_number_yer && <p>YER: {p.config.account_number_yer}</p>}
                                  {p.config.account_number_sar && <p>SAR: {p.config.account_number_sar}</p>}
                                  {p.config.account_number_usd && <p>USD: {p.config.account_number_usd}</p>}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                            {(fields.length > 0 || meta.custom) && (
                              <button onClick={() => openEdit(p)}
                                className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-2)] hover:border-brand-500 hover:text-brand-700 transition-colors">
                                <HiCog6Tooth className="text-sm"/> إعداد
                              </button>
                            )}
                            {p.code !== "cod" && (
                              <button onClick={() => toggleTestMode(p)} disabled={saving === p.id + "_test"}
                                className={`text-[10px] rounded-lg px-2 py-1 font-medium border transition-all ${
                                  p.is_test_mode
                                    ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                                    : "border-[var(--border)] text-[var(--text-muted)]"
                                }`}>
                                {p.is_test_mode ? "وضع الاختبار" : "مباشر"}
                              </button>
                            )}
                            <button onClick={() => toggle(p)} disabled={saving === p.id}
                              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
                                p.is_active
                                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 hover:bg-red-50 hover:text-red-600"
                                  : "bg-[var(--border)] text-[var(--text-2)] hover:bg-brand-700 hover:text-white"
                              }`}>
                              {p.is_active ? <><HiCheckCircle className="text-base"/> مفعّل</> : <><HiXCircle className="text-base"/> معطّل</>}
                            </button>
                            {meta.custom && (
                              <button onClick={() => remove(p)} disabled={saving === p.id}
                                className="rounded-lg border border-red-200 text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="حذف">
                                <HiTrash className="text-sm"/>
                              </button>
                            )}
                          </div>
                        </div>

                        {meta.type === "transfer_point" && p.is_active && (
                          <p className="mt-3 text-xs text-[var(--text-muted)] border-t border-[var(--border)] pt-2.5">
                            نقاط هذه الشبكة تُدار من{" "}
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
            </section>
          );
        })
      )}

      <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 p-4 text-sm text-blue-700 dark:text-blue-300">
        ℹ مفاتيح API (مثل Stripe Secret) تُوضع في متغيرات البيئة في Vercel ولا تُخزَّن هنا. بيانات الحسابات والمحافظ آمنة في قاعدة البيانات وتُعدَّل من هذه الصفحة.
      </div>

      {/* ===== Edit Modal ===== */}
      {editModal && (() => {
        const type   = editModal.metadata?.type ?? "";
        const fields = CONFIG_FIELDS[type] ?? [];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditModal(null)}/>
            <div className="relative w-full max-w-md rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[var(--text-1)]">إعداد {editModal.metadata?.name_ar ?? editModal.name}</h3>
                <button onClick={() => setEditModal(null)} className="text-[var(--text-muted)] hover:text-[var(--text-1)]"><HiXMark className="text-xl"/></button>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-2)] block mb-1.5">الاسم</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"/>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] block mb-1.5">الوصف</label>
                <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"/>
              </div>

              {fields.map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-[var(--text-2)] block mb-1.5">{f.label}</label>
                  <input type="text" dir="ltr" placeholder={f.placeholder} value={cfg[f.key] ?? ""}
                    onChange={e => setCfg(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-brand-500"/>
                </div>
              ))}

              {/* حدود المبلغ والترتيب */}
              <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
                <p className="text-xs font-bold text-[var(--text-1)]">القيود والترتيب</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-medium text-[var(--text-2)] block mb-1">حد أدنى ﷼</label>
                    <input type="number" dir="ltr" placeholder="—" value={editMin}
                      onChange={e => setEditMin(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-2.5 py-2 text-sm focus:outline-none focus:border-brand-500"/>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[var(--text-2)] block mb-1">حد أعلى ﷼</label>
                    <input type="number" dir="ltr" placeholder="—" value={editMax}
                      onChange={e => setEditMax(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-2.5 py-2 text-sm focus:outline-none focus:border-brand-500"/>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[var(--text-2)] block mb-1">الترتيب</label>
                    <input type="number" dir="ltr" value={editOrder}
                      onChange={e => setEditOrder(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-2.5 py-2 text-sm focus:outline-none focus:border-brand-500"/>
                  </div>
                </div>
                {MANUAL_TYPES.includes(type) && (
                  <div className="grid grid-cols-2 gap-2">
                    {FEE_FIELDS.map(f => (
                      <div key={f.key}>
                        <label className="text-[11px] font-medium text-[var(--text-2)] block mb-1">{f.label}</label>
                        <input type="number" dir="ltr" placeholder={f.placeholder} value={cfg[f.key] ?? ""}
                          onChange={e => setCfg(prev => ({ ...prev, [f.key]: e.target.value }))}
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-2.5 py-2 text-sm focus:outline-none focus:border-brand-500"/>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* تعليمات مخصصة للعميل */}
              {MANUAL_TYPES.includes(type) && (
                <div>
                  <label className="text-xs font-medium text-[var(--text-2)] block mb-1.5">
                    تعليمات الدفع للعميل (سطر لكل خطوة — اتركها فارغة للتعليمات التلقائية)
                  </label>
                  <textarea rows={4} value={editInstr}
                    onChange={e => setEditInstr(e.target.value)}
                    placeholder={"افتح تطبيق المحفظة\nحوّل المبلغ إلى الرقم الظاهر\nاكتب المرجع في بيان التحويل"}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 resize-none"/>
                </div>
              )}

              {/* Logo upload */}
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] block mb-1.5">شعار الخدمة</label>
                <input ref={editLogoRef} type="file" accept="image/*" className="hidden"
                  onChange={e => setLogoFile(e.target.files?.[0] ?? null)}/>
                <button onClick={() => editLogoRef.current?.click()}
                  className={`w-full rounded-xl border-2 border-dashed px-4 py-3 text-sm text-center transition-colors flex items-center justify-center gap-2 ${
                    logoFile ? "border-green-400 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    : "border-[var(--border)] text-[var(--text-muted)] hover:border-brand-400"
                  }`}>
                  <HiPhoto className="text-lg"/>
                  {logoFile ? logoFile.name : editModal.metadata?.logo_url ? "تغيير الشعار الحالي" : "رفع شعار (PNG/SVG)"}
                </button>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setEditModal(null)} className="btn-ghost border border-[var(--border)] flex-1 justify-center">إلغاء</button>
                <button onClick={saveEdit} disabled={cfgSaving} className="btn-primary flex-1 justify-center gap-2">
                  <HiCheckCircle className="text-base"/> {cfgSaving ? "جاري الحفظ..." : "حفظ"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== Add Modal ===== */}
      {addModal && (() => {
        const fields = CONFIG_FIELDS[addModal] ?? [];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAddModal(null)}/>
            <div className="relative w-full max-w-md rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[var(--text-1)]">إضافة {ADD_TYPE_LABELS[addModal]}</h3>
                <button onClick={() => setAddModal(null)} className="text-[var(--text-muted)] hover:text-[var(--text-1)]"><HiXMark className="text-xl"/></button>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-2)] block mb-1.5">الاسم *</label>
                <input type="text" value={addName} onChange={e => setAddName(e.target.value)}
                  placeholder={addModal === "manual_wallet" ? "مثال: محفظة كاش" : addModal === "bank_transfer" ? "مثال: بنك التضامن" : "مثال: شبكة النجم"}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"/>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] block mb-1.5">الوصف</label>
                <input type="text" value={addDesc} onChange={e => setAddDesc(e.target.value)}
                  placeholder="وصف قصير يظهر للعميل"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"/>
              </div>

              {fields.map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-[var(--text-2)] block mb-1.5">{f.label}</label>
                  <input type="text" dir="ltr" placeholder={f.placeholder} value={addCfg[f.key] ?? ""}
                    onChange={e => setAddCfg(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-brand-500"/>
                </div>
              ))}

              {addModal === "transfer_point" && (
                <p className="text-xs text-[var(--text-muted)] rounded-lg bg-[var(--bg-page)] p-3">
                  بعد إضافة الشبكة، أضف نقاطها (الفروع/الوكلاء) من صفحة نقاط التحويل.
                </p>
              )}

              <div>
                <label className="text-xs font-medium text-[var(--text-2)] block mb-1.5">شعار الخدمة</label>
                <input ref={addLogoRef} type="file" accept="image/*" className="hidden"
                  onChange={e => setAddLogo(e.target.files?.[0] ?? null)}/>
                <button onClick={() => addLogoRef.current?.click()}
                  className={`w-full rounded-xl border-2 border-dashed px-4 py-3 text-sm text-center transition-colors flex items-center justify-center gap-2 ${
                    addLogo ? "border-green-400 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    : "border-[var(--border)] text-[var(--text-muted)] hover:border-brand-400"
                  }`}>
                  <HiPhoto className="text-lg"/>
                  {addLogo ? addLogo.name : "رفع شعار (PNG/SVG)"}
                </button>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setAddModal(null)} className="btn-ghost border border-[var(--border)] flex-1 justify-center">إلغاء</button>
                <button onClick={saveAdd} disabled={addSaving || !addName.trim()} className="btn-primary flex-1 justify-center gap-2">
                  <HiPlus className="text-base"/> {addSaving ? "جاري الإضافة..." : "إضافة"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
