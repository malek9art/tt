"use client";
import { useEffect, useState, useCallback } from "react";
import {
  HiCheckCircle, HiXCircle, HiClock, HiMagnifyingGlass,
  HiArrowPath, HiBanknotes,
} from "react-icons/hi2";

interface Payment {
  id: string;
  provider_code: string;
  amount: number;
  currency: string;
  status: string;
  transaction_ref: string | null;
  confirmed_at: string | null;
  created_at: string;
  orders: {
    id: string;
    order_number: string;
    profiles: { full_name: string | null; phone: string | null } | null;
  } | null;
}

const STATUS_CFG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  pending:                { label:"معلّق",          cls:"bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400", icon:<HiClock/> },
  awaiting_confirmation:  { label:"بانتظار التأكيد", cls:"bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",   icon:<HiClock/> },
  paid:                   { label:"مدفوع",           cls:"bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400", icon:<HiCheckCircle/> },
  failed:                 { label:"فشل",             cls:"bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",         icon:<HiXCircle/> },
  expired:                { label:"منتهي",           cls:"bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",       icon:<HiXCircle/> },
  refunded:               { label:"مُسترجع",         cls:"bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400", icon:<HiArrowPath/> },
};

const PROVIDER_NAMES: Record<string, string> = {
  cod:"COD", stripe:"Stripe", jawali:"جوالي", jeeb:"جيب",
  floosak:"فلوسك", kuraimi:"الكريمي", qutaibi:"القطيبي",
  onecash:"وان كاش", yemenmobile:"يمن موبايل", bank:"تحويل بنكي",
};

export default function PaymentsPage() {
  const [payments,  setPayments]  = useState<Payment[]>([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState("");
  const [confirming,setConfirming]= useState<string | null>(null);
  const [txnRef,    setTxnRef]    = useState("");
  const [modal,     setModal]     = useState<Payment | null>(null);
  const [saving,    setSaving]    = useState(false);

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

  const confirm = async () => {
    if (!modal) return;
    setSaving(true);
    const res = await fetch(`/api/admin/payments/${modal.id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionRef: txnRef }),
    });
    const d = await res.json();
    if (d.success) { setModal(null); setTxnRef(""); load(); }
    setSaving(false);
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
        <button onClick={load} className="btn-ghost border border-[var(--border)] gap-2">
          <HiArrowPath className="text-base"/> تحديث
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {["","pending","awaiting_confirmation","paid","failed"].map(s => (
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
                {["رقم الطلب","العميل","المزود","المبلغ","الحالة","التاريخ","إجراء"].map(h => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {payments.map(p => {
                const cfg    = STATUS_CFG[p.status] ?? STATUS_CFG["pending"];
                const order  = p.orders;
                const profile = order?.profiles;
                return (
                  <tr key={p.id} className="bg-[var(--bg-card)] hover:bg-[var(--bg-page)] transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-[var(--text-1)]" dir="ltr">
                      #{order?.order_number ?? "—"}
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
                      {needsConfirm(p) ? (
                        <button onClick={() => { setModal(p); setTxnRef(""); confirming === p.id ? setConfirming(null) : setConfirming(p.id); }}
                          className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800 transition-colors">
                          تأكيد الدفع
                        </button>
                      ) : p.confirmed_at ? (
                        <span className="text-xs text-[var(--text-muted)]">{fmt(p.confirmed_at)}</span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModal(null)}/>
          <div className="relative w-full max-w-sm rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-[var(--text-1)]">تأكيد عملية الدفع</h3>
            <div className="rounded-xl bg-[var(--bg-page)] p-4 space-y-1 text-sm">
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
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] mb-1.5 block">
                رقم مرجع العملية (اختياري)
              </label>
              <input type="text" dir="ltr" placeholder="TXN-XXXXXXXX" value={txnRef}
                onChange={e => setTxnRef(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-sm"/>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="btn-ghost border border-[var(--border)] flex-1 justify-center">
                إلغاء
              </button>
              <button onClick={confirm} disabled={saving} className="btn-primary flex-1 justify-center gap-2">
                <HiCheckCircle className="text-base"/> {saving ? "..." : "تأكيد الاستلام"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
