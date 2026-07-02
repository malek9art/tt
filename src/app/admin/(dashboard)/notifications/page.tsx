"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  HiBell, HiCheckCircle, HiTrash, HiShoppingCart,
  HiCurrencyDollar, HiXMark, HiExclamationTriangle,
  HiCube, HiInformationCircle, HiArrowLeft, HiPaperAirplane,
} from "react-icons/hi2";

interface Notification {
  id:         string;
  type:       string;
  title_ar:   string;
  message_ar: string;
  payload:    { link?: string } | null;
  is_read:    boolean;
  created_at: string;
}

const TYPE_MAP: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  order_new:       { label: "طلب جديد",     icon: <HiShoppingCart />,        color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20" },
  order_paid:      { label: "تم الدفع",     icon: <HiCurrencyDollar />,      color: "text-green-500 bg-green-50 dark:bg-green-900/20" },
  order_cancelled: { label: "إلغاء طلب",    icon: <HiXMark />,               color: "text-red-500 bg-red-50 dark:bg-red-900/20" },
  stock_low:       { label: "مخزون منخفض",  icon: <HiExclamationTriangle />, color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20" },
  stock_out:       { label: "نفد المخزون",  icon: <HiCube />,                color: "text-red-500 bg-red-50 dark:bg-red-900/20" },
  system:          { label: "نظام",          icon: <HiInformationCircle />,   color: "text-brand-500 bg-brand-50 dark:bg-brand-900/20" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return "الآن";
  if (m < 60)  return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `منذ ${h} ساعة`;
  const d = Math.floor(h / 24);
  return `منذ ${d} ${d === 1 ? "يوم" : "أيام"}`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items,    setItems]    = useState<Notification[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<"all"|"unread"|"order_new"|"stock_low"|"stock_out">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch("/api/admin/notifications?limit=100");
    const data = await res.json() as { notifications: Notification[] };
    setItems(data.notifications ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(n => {
    if (filter === "unread") return !n.is_read;
    if (filter !== "all")   return n.type === filter;
    return true;
  });

  const unread = items.filter(n => !n.is_read).length;

  const markAll = async () => {
    await fetch("/api/admin/notifications", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ all: true }),
    });
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const markSelected = async () => {
    if (!selected.size) return;
    const ids = [...selected];
    await fetch("/api/admin/notifications", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ids }),
    });
    setItems(prev => prev.map(n => selected.has(n.id) ? { ...n, is_read: true } : n));
    setSelected(new Set());
  };

  const deleteRead = async () => {
    await fetch("/api/admin/notifications", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ all: true }),
    });
    setItems(prev => prev.filter(n => !n.is_read));
  };

  const deleteSelected = async () => {
    if (!selected.size) return;
    const ids = [...selected];
    await fetch("/api/admin/notifications", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ids }),
    });
    setItems(prev => prev.filter(n => !selected.has(n.id)));
    setSelected(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      await fetch("/api/admin/notifications", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ids: [n.id] }),
      });
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    }
    if (n.payload?.link) router.push(n.payload?.link);
  };

  const filterButtons: { v: typeof filter; l: string }[] = [
    { v: "all",       l: `الكل (${items.length})` },
    { v: "unread",    l: `غير مقروءة (${unread})` },
    { v: "order_new", l: "طلبات جديدة" },
    { v: "stock_low", l: "مخزون منخفض" },
    { v: "stock_out", l: "نفد المخزون" },
  ];

  const [composer,   setComposer]   = useState(false);
  const [cAudience,  setCAudience]  = useState<"all_customers"|"all_drivers">("all_customers");
  const [cTitle,     setCTitle]     = useState("");
  const [cMsg,       setCMsg]       = useState("");
  const [cSending,   setCSending]   = useState(false);
  const [cResult,    setCResult]    = useState("");

  const sendBroadcast = async () => {
    if (!cTitle.trim() || !cMsg.trim()) { setCResult("⚠ العنوان والرسالة مطلوبان"); return; }
    setCSending(true); setCResult("");
    const res = await fetch("/api/admin/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audience: cAudience, title: cTitle.trim(), message: cMsg.trim() }),
    });
    const d = await res.json();
    setCSending(false);
    if (res.ok) {
      setCResult(`✓ أُرسل إلى ${d.sent} مستخدم`);
      setCTitle(""); setCMsg("");
    } else {
      setCResult(`⚠ ${d.error ?? "فشل الإرسال"}`);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-1)]">الإشعارات</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {unread > 0 ? `${unread} إشعار غير مقروء` : "جميع الإشعارات مقروءة"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 ? (
            <>
              <button onClick={markSelected}
                className="btn-ghost border border-[var(--border)] gap-1.5 text-sm">
                <HiCheckCircle className="text-green-500" /> تمييز كمقروء ({selected.size})
              </button>
              <button onClick={deleteSelected}
                className="btn-ghost border border-red-200 text-red-600 gap-1.5 text-sm">
                <HiTrash /> حذف ({selected.size})
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setComposer(!composer)}
                className="btn-primary gap-1.5 text-sm">
                <HiPaperAirplane className="text-sm"/> إرسال إشعار
              </button>
              {unread > 0 && (
                <button onClick={markAll}
                  className="btn-ghost border border-[var(--border)] gap-1.5 text-sm">
                  <HiCheckCircle className="text-green-500" /> قراءة الكل
                </button>
              )}
              <button onClick={deleteRead}
                className="btn-ghost border border-[var(--border)] gap-1.5 text-sm text-[var(--text-muted)]">
                <HiTrash /> حذف المقروءة
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {filterButtons.map(({ v, l }) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === v
                ? "bg-brand-700 text-white"
                : "border border-[var(--border)] text-[var(--text-2)] hover:border-brand-300"
            }`}>{l}</button>
        ))}
      </div>

      {/* List */}
      <div className="card-base overflow-hidden">
        {/* Composer */}
      {composer && (
        <div className="card-base p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-[var(--text-1)]">إرسال إشعار جديد</h2>
            <button onClick={() => setComposer(false)} className="text-[var(--text-muted)] hover:text-[var(--text-1)]"><HiXMark/></button>
          </div>
          <div className="flex rounded-xl border border-[var(--border)] overflow-hidden w-fit">
            <button onClick={() => setCAudience("all_customers")}
              className={`px-4 py-2 text-xs font-semibold transition-colors ${cAudience === "all_customers" ? "bg-brand-700 text-white" : "bg-[var(--bg-page)] text-[var(--text-2)]"}`}>
              جميع العملاء
            </button>
            <button onClick={() => setCAudience("all_drivers")}
              className={`px-4 py-2 text-xs font-semibold transition-colors ${cAudience === "all_drivers" ? "bg-brand-700 text-white" : "bg-[var(--bg-page)] text-[var(--text-2)]"}`}>
              جميع المناديب
            </button>
          </div>
          <input value={cTitle} onChange={e => setCTitle(e.target.value)} placeholder="عنوان الإشعار"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"/>
          <textarea value={cMsg} onChange={e => setCMsg(e.target.value)} rows={3} placeholder="نص الرسالة…"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 resize-none"/>
          <div className="flex items-center gap-3">
            <button onClick={sendBroadcast} disabled={cSending}
              className="btn-primary gap-1.5">
              <HiPaperAirplane className="text-sm"/> {cSending ? "جاري الإرسال..." : "إرسال"}
            </button>
            {cResult && <p className="text-sm text-[var(--text-2)]">{cResult}</p>}
          </div>
        </div>
      )}

      {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16 w-full rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <HiBell className="mx-auto mb-3 text-4xl opacity-20 text-[var(--text-muted)]" />
            <p className="text-[var(--text-muted)]">لا توجد إشعارات</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filtered.map(n => {
              const meta = TYPE_MAP[n.type] ?? TYPE_MAP.system;
              return (
                <div key={n.id}
                  className={`flex items-start gap-3 px-4 py-4 transition-colors ${
                    !n.is_read ? "bg-brand-50/40 dark:bg-brand-900/10" : ""
                  }`}>
                  {/* Checkbox */}
                  <input type="checkbox"
                    checked={selected.has(n.id)}
                    onChange={() => toggleSelect(n.id)}
                    className="mt-1 h-4 w-4 rounded border-[var(--border)] accent-brand-700 shrink-0"
                    onClick={e => e.stopPropagation()} />

                  {/* Icon */}
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg ${meta.color}`}>
                    {meta.icon}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleClick(n)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm leading-tight ${!n.is_read ? "font-bold text-[var(--text-1)]" : "font-medium text-[var(--text-2)]"}`}>
                        {n.title_ar}
                      </p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${meta.color} font-medium`}>
                        {meta.label}
                      </span>
                      {!n.is_read && (
                        <span className="h-2 w-2 rounded-full bg-brand-700 inline-block" />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-[var(--text-muted)]">{n.message_ar}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{timeAgo(n.created_at)}</p>
                  </div>

                  {/* Arrow if has link */}
                  {n.payload?.link && (
                    <button onClick={() => handleClick(n)}
                      className="mt-1 shrink-0 text-[var(--text-muted)] hover:text-brand-700 transition-colors">
                      <HiArrowLeft className="text-sm" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
