"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  HiCheckCircle, HiXCircle, HiClock, HiArrowPath, HiBanknotes,
  HiXMark, HiDocumentArrowUp, HiListBullet,
} from "react-icons/hi2";
import { createBrowserClient } from "@supabase/ssr";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Payment {
  id: string;
  provider_code: string;
  amount: number;
  currency: string;
  status: string;
  transaction_ref: string | null;
  receipt_url: string | null;
  confirmed_at: string | null;
  created_at: string;
  reference_code: string | null;
  paid_amount: number | null;
  review_note: string | null;
  customer_note: string | null;
  expires_at: string | null;
  orders: {
    id: string;
    order_number: string;
    profiles: { full_name: string | null; phone: string | null } | null;
  } | null;
}

interface PaymentLog {
  id: string;
  event_type: string;
  direction: string;
  provider_code: string;
  status_code: number | null;
  error_message: string | null;
  created_at: string;
}

const STATUS_CFG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  pending:               { label:"معلّق",           cls:"bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400", icon:<HiClock/> },
  awaiting_confirmation: { label:"بانتظار التأكيد", cls:"bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",       icon:<HiClock/> },
  paid:                  { label:"مدفوع",            cls:"bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",   icon:<HiCheckCircle/> },
  failed:                { label:"فشل",              cls:"bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",           icon:<HiXCircle/> },
  expired:               { label:"منتهي",            cls:"bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",         icon:<HiXCircle/> },
  refunded:              { label:"مُسترجع",          cls:"bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400", icon:<HiArrowPath/> },
};

const PROVIDER_NAMES: Record<string, string> = {
  cod:"COD", stripe:"Stripe", jawali:"جوالي", jeeb:"جيب",
  floosak:"فلوسك", kuraimi:"الكريمي", qutaibi:"القطيبي",
  onecash:"وان كاش", yemenmobile:"يمن موبايل", bank:"تحويل بنكي",
};

export default function PaymentsPage() {
  const [payments,    setPayments]    = useState<Payment[]>([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState("");
  const [modal,       setModal]       = useState<Payment | null>(null);
  const [txnRef,      setTxnRef]      = useState("");
  const [saving,      setSaving]      = useState(false);
  const [receipt,     setReceipt]     = useState<File | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [logsModal,   setLogsModal]   = useState<Payment | null>(null);
  const [logs,        setLogs]        = useState<PaymentLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // نافذة رفض / طلب تعديل
  const [actionModal, setActionModal] = useState<{ payment: Payment; kind: "reject" | "revision" } | null>(null);
  const [actionNote,  setActionNote]  = useState("");
  const [actionError, setActionError] = useState("");
  const [paidAmount,  setPaidAmount]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const qs = filter ? `?status=${filter}` : "";
    const res = await fetch(`/api/admin/payments${qs}`);
    const d   = await res.json();
    setPayments(d.payments ?? []);
    setTotal(d.count ?? 0);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openConfirm = (p: Payment) => { setModal(p); setTxnRef(""); setReceipt(null); setPaidAmount(String(p.amount)); };

  const openAction = (p: Payment, kind: "reject" | "revision") => {
    setActionModal({ payment: p, kind }); setActionNote(""); setActionError("");
  };

  const submitAction = async () => {
    if (!actionModal) return;
    const note = actionNote.trim();
    if (!note) { setActionError("النص إلزامي — سيصل للعميل حرفياً"); return; }
    setSaving(true); setActionError("");
    const path = actionModal.kind === "reject" ? "reject" : "request-revision";
    const res  = await fetch(`/api/admin/payments/${actionModal.payment.id}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actionModal.kind === "reject" ? { reason: note } : { note }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) { setActionError(d.error ?? "فشل الإجراء"); return; }
    setActionModal(null);
    load();
  };

  const uploadReceipt = async (paymentId: string, file: File): Promise<string | null> => {
    setUploading(true);
    const ext  = file.name.split(".").pop() ?? "jpg";
    const path = `receipts/${paymentId}.${ext}`;
    const { error } = await sb.storage.from("payment-receipts").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { setUploading(false); return null; }
    const { data } = sb.storage.from("payment-receipts").getPublicUrl(path);
    setUploading(false);
    return data.publicUrl;
  };

  const confirm = async () => {
    if (!modal) return;
    setSaving(true);
    let receiptUrl: string | null = null;
    if (receipt) receiptUrl = await uploadReceipt(modal.id, receipt);

    const res = await fetch(`/api/admin/payments/${modal.id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionRef: txnRef || undefined,
        receiptUrl,
        paidAmount: paidAmount ? Number(paidAmount) : undefined,
      }),
    });
    const d = await res.json();
    if (d.success) { setModal(null); load(); }
    else if (d.error) alert(d.error);
    setSaving(false);
  };

  const refund = async (p: Payment) => {
    if (!window.confirm(`تأكيد استرجاع دفعة الطلب #${p.orders?.order_number}؟`)) return;
    await fetch(`/api/admin/payments/${p.id}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "استرجاع يدوي من الإدارة" }),
    });
    load();
  };

  const viewLogs = async (p: Payment) => {
    setLogsModal(p);
    setLogs([]);
    setLogsLoading(true);
    const res  = await fetch(`/api/admin/payments/${p.id}`);
    const data = await res.json();
    setLogs(data.logs ?? []);
    setLogsLoading(false);
  };

  const needsConfirm = (p: Payment) =>
    ["pending","awaiting_confirmation"].includes(p.status) && p.provider_code !== "stripe";

  const fmt = (date: string) =>
    new Intl.DateTimeFormat("ar-YE", { dateStyle:"short", timeStyle:"short" }).format(new Date(date));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-1)]">سجل المدفوعات</h1>
          <p className="text-sm text-[var(--text-muted)]">{total} عملية دفع</p>
        </div>
        <button onClick={load} className="btn-ghost border border-[var(--border)] gap-2 flex items-center">
          <HiArrowPath className="text-base"/> تحديث
        </button>
      </div>

      {/* Status filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {["","pending","awaiting_confirmation","paid","failed","expired","refunded"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
              filter === s
                ? "bg-brand-700 text-white"
                : "bg-[var(--border)] text-[var(--text-2)] hover:bg-brand-700/20"
            }`}>
            {s === "" ? "الكل" : (STATUS_CFG[s]?.label ?? s)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i=><div key={i} className="skeleton h-16 rounded-xl"/>)}</div>
      ) : payments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
          <HiBanknotes className="text-5xl mx-auto mb-3 text-[var(--text-muted)] opacity-40"/>
          <p className="font-medium text-[var(--text-2)]">لا توجد مدفوعات</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-card)]">
              <tr>
                {["رقم الطلب","المرجع","العميل","المزود","المبلغ","الحالة","التاريخ","إجراءات"].map(h => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {payments.map(p => {
                const cfg     = STATUS_CFG[p.status] ?? STATUS_CFG["pending"];
                const order   = p.orders;
                const profile = order?.profiles;
                return (
                  <tr key={p.id} className="bg-[var(--bg-card)] hover:bg-[var(--bg-page)] transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-[var(--text-1)]" dir="ltr">
                      #{order?.order_number ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-brand-700 dark:text-accent-400" dir="ltr">
                      {p.reference_code ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--text-1)]">{profile?.full_name ?? "—"}</p>
                      {profile?.phone && <p className="text-xs text-[var(--text-muted)]" dir="ltr">{profile.phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-2)]">{PROVIDER_NAMES[p.provider_code] ?? p.provider_code}</td>
                    <td className="px-4 py-3 font-bold text-[var(--text-1)] whitespace-nowrap">
                      {p.amount.toLocaleString("ar")} {p.currency}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.cls}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">
                      {fmt(p.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {needsConfirm(p) && (
                          <>
                            <button onClick={() => openConfirm(p)}
                              className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800 transition-colors">
                              تأكيد
                            </button>
                            <button onClick={() => openAction(p, "revision")}
                              className="rounded-lg border border-amber-300 text-amber-600 px-3 py-1.5 text-xs font-medium hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                              طلب تعديل
                            </button>
                            <button onClick={() => openAction(p, "reject")}
                              className="rounded-lg border border-red-300 text-red-600 px-3 py-1.5 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                              رفض
                            </button>
                          </>
                        )}
                        {p.status === "paid" && p.provider_code !== "stripe" && (
                          <button onClick={() => refund(p)}
                            className="rounded-lg border border-red-300 text-red-600 px-3 py-1.5 text-xs font-medium hover:bg-red-50 transition-colors">
                            استرجاع
                          </button>
                        )}
                        {p.receipt_url && (
                          <a href={p.receipt_url} target="_blank" rel="noreferrer"
                            className="text-xs text-brand-700 dark:text-accent-400 underline">
                            إيصال
                          </a>
                        )}
                        <button onClick={() => viewLogs(p)} title="سجل العمليات"
                          className="text-[var(--text-muted)] hover:text-[var(--text-1)] transition-colors">
                          <HiListBullet className="text-base"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Confirm Modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModal(null)}/>
          <div className="relative w-full max-w-sm rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--text-1)]">تأكيد عملية الدفع</h3>
              <button onClick={() => setModal(null)} className="text-[var(--text-muted)] hover:text-[var(--text-1)]">
                <HiXMark className="text-xl"/>
              </button>
            </div>

            <div className="rounded-xl bg-[var(--bg-page)] p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">الطلب</span>
                <span className="font-mono font-bold text-[var(--text-1)]" dir="ltr">#{modal.orders?.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">المبلغ</span>
                <span className="font-bold text-brand-700 dark:text-accent-400">{modal.amount.toLocaleString("ar")} {modal.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">المزود</span>
                <span className="text-[var(--text-1)]">{PROVIDER_NAMES[modal.provider_code] ?? modal.provider_code}</span>
              </div>
            </div>

            {/* إثبات العميل إن وُجد */}
            {(modal.receipt_url || modal.customer_note) && (
              <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 text-xs space-y-1.5">
                <p className="font-semibold text-blue-700 dark:text-blue-300">إثبات العميل:</p>
                {modal.customer_note && <p className="text-blue-700 dark:text-blue-300 whitespace-pre-line">{modal.customer_note}</p>}
                {modal.receipt_url && (
                  <a href={modal.receipt_url} target="_blank" rel="noreferrer" className="underline font-semibold text-blue-700 dark:text-blue-300">
                    📎 فتح صورة الإيصال
                  </a>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1.5 block">
                المبلغ المدفوع فعلاً *
              </label>
              <input type="number" dir="ltr" value={paidAmount}
                onChange={e => setPaidAmount(e.target.value)}
                className={`w-full rounded-xl border bg-[var(--bg-page)] px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 ${
                  paidAmount && Number(paidAmount) !== modal.amount ? "border-red-400" : "border-[var(--border)]"
                }`}/>
              {paidAmount && Number(paidAmount) !== modal.amount && (
                <p className="mt-1 text-xs text-red-500">
                  لا يطابق المطلوب ({modal.amount.toLocaleString("ar")}) — لا يمكن التأكيد؛ استخدم «رفض» مع ذكر السبب
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1.5 block">
                رقم مرجع العملية (اختياري)
              </label>
              <input type="text" dir="ltr" placeholder="TXN-XXXXXXXX" value={txnRef}
                onChange={e => setTxnRef(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"/>
            </div>

            {/* Receipt upload */}
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1.5 block">
                صورة إيصال التحويل (اختياري)
              </label>
              <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
                onChange={e => setReceipt(e.target.files?.[0] ?? null)}/>
              <button onClick={() => fileRef.current?.click()}
                className={`w-full rounded-xl border-2 border-dashed py-3 text-sm text-center transition-colors flex flex-col items-center gap-1 ${
                  receipt
                    ? "border-green-400 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    : "border-[var(--border)] text-[var(--text-muted)] hover:border-brand-400"
                }`}>
                <HiDocumentArrowUp className="text-xl"/>
                {receipt ? receipt.name : "اضغط لرفع صورة الإيصال"}
              </button>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="btn-ghost border border-[var(--border)] flex-1 justify-center">
                إلغاء
              </button>
              <button onClick={confirm} disabled={saving || uploading} className="btn-primary flex-1 justify-center gap-2">
                <HiCheckCircle className="text-base"/>
                {uploading ? "جاري الرفع..." : saving ? "جاري الحفظ..." : "تأكيد الاستلام"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject / Revision Modal ── */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setActionModal(null)}/>
          <div className="relative w-full max-w-sm rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--text-1)]">
                {actionModal.kind === "reject" ? "رفض عملية الدفع" : "طلب استكمال من العميل"}
              </h3>
              <button onClick={() => setActionModal(null)} className="text-[var(--text-muted)] hover:text-[var(--text-1)]">
                <HiXMark className="text-xl"/>
              </button>
            </div>

            <div className="rounded-xl bg-[var(--bg-page)] p-3 text-sm flex justify-between">
              <span className="text-[var(--text-muted)]">الطلب <b className="font-mono text-[var(--text-1)]" dir="ltr">#{actionModal.payment.orders?.order_number}</b></span>
              <span className="font-bold text-brand-700 dark:text-accent-400">
                {actionModal.payment.amount.toLocaleString("ar")} {actionModal.payment.currency}
              </span>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1.5 block">
                {actionModal.kind === "reject"
                  ? "سبب الرفض * (يصل للعميل حرفياً)"
                  : "ما المطلوب من العميل؟ * (يصله حرفياً)"}
              </label>
              <textarea rows={3} value={actionNote}
                onChange={e => { setActionNote(e.target.value); setActionError(""); }}
                placeholder={actionModal.kind === "reject"
                  ? "مثال: المبلغ المستلم أقل من قيمة الطلب"
                  : "مثال: صورة الإيصال غير واضحة — أعد رفع صورة أوضح"}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 resize-none"/>
              {actionError && <p className="mt-1 text-xs text-red-500">⚠ {actionError}</p>}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setActionModal(null)} className="btn-ghost border border-[var(--border)] flex-1 justify-center">
                إلغاء
              </button>
              <button onClick={submitAction} disabled={saving}
                className={`flex-1 justify-center items-center flex gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition-colors ${
                  actionModal.kind === "reject" ? "bg-red-600 hover:bg-red-700" : "bg-amber-500 hover:bg-amber-600"
                }`}>
                {saving ? "جاري..." : actionModal.kind === "reject" ? "رفض الدفعة" : "إرسال الطلب"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Logs Modal ── */}
      {logsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setLogsModal(null)}/>
          <div className="relative w-full max-w-lg rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-1)]">سجل العمليات</h3>
                <p className="text-xs text-[var(--text-muted)]">طلب #{logsModal.orders?.order_number}</p>
              </div>
              <button onClick={() => setLogsModal(null)} className="text-[var(--text-muted)] hover:text-[var(--text-1)]">
                <HiXMark className="text-xl"/>
              </button>
            </div>

            {logsLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-10 rounded-lg"/>)}</div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-center text-[var(--text-muted)] py-6">لا توجد سجلات لهذه العملية</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {logs.map(l => (
                  <div key={l.id} className={`rounded-xl p-3 text-xs flex gap-3 items-start ${
                    l.error_message ? "bg-red-50 dark:bg-red-900/10" : "bg-[var(--bg-page)]"
                  }`}>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[var(--text-1)]">{l.event_type}</span>
                        <span className={`rounded-full px-1.5 py-0.5 ${
                          l.direction === "inbound"
                            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        }`}>{l.direction === "inbound" ? "وارد" : "صادر"}</span>
                        {l.status_code && (
                          <span className={`rounded px-1.5 py-0.5 font-mono ${
                            l.status_code < 300 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}>{l.status_code}</span>
                        )}
                      </div>
                      {l.error_message && (
                        <p className="text-red-600 dark:text-red-400">{l.error_message}</p>
                      )}
                    </div>
                    <span className="text-[var(--text-muted)] whitespace-nowrap shrink-0">
                      {new Date(l.created_at).toLocaleTimeString("ar-YE")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
