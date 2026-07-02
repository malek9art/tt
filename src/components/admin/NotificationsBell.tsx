"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  HiBell, HiCheckCircle, HiXMark, HiShoppingCart,
  HiCurrencyDollar, HiExclamationTriangle, HiCube,
  HiInformationCircle,
} from "react-icons/hi2";

interface Notification {
  id:         string;
  type:       string;
  title_ar:   string;
  message_ar: string;
  payload:    { link?: string } | null;
  link:       string | null;
  is_read:    boolean;
  created_at: string;
}

function typeIcon(type: string) {
  switch (type) {
    case "order_new":       return <HiShoppingCart    className="text-blue-500"   />;
    case "order_paid":      return <HiCurrencyDollar  className="text-green-500"  />;
    case "order_cancelled": return <HiXMark           className="text-red-500"    />;
    case "stock_low":       return <HiExclamationTriangle className="text-amber-500" />;
    case "stock_out":       return <HiCube            className="text-red-500"    />;
    default:                return <HiInformationCircle className="text-brand-500" />;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "الآن";
  if (m < 60) return `منذ ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} س`;
  return `منذ ${Math.floor(h / 24)} ي`;
}

export default function NotificationsBell() {
  const router = useRouter();
  const [open,  setOpen]  = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = items.filter(n => !n.is_read).length;

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch("/api/admin/notifications?limit=20");
    const data = await res.json() as { notifications: Notification[] };
    setItems(data.notifications ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000); // poll every 30s
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAll = async () => {
    await fetch("/api/admin/notifications", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ all: true }),
    });
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const markOne = async (id: string) => {
    await fetch("/api/admin/notifications", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ids: [id] }),
    });
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleClick = (n: Notification) => {
    if (!n.is_read) markOne(n.id);
    if (n.payload?.link) { router.push(n.payload?.link); setOpen(false); }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(o => !o); if (!open) load(); }}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-2)] hover:bg-[var(--border)] transition-colors">
        <HiBell className="text-base" />
        {unread > 0 && (
          <span className="absolute top-0.5 end-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-10 z-50 w-80 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--text-1)]">
              الإشعارات {unread > 0 && <span className="ms-1 rounded-full bg-red-500 px-1.5 text-[10px] text-white">{unread}</span>}
            </p>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAll} className="text-xs text-brand-700 dark:text-accent-400 hover:underline">
                  قراءة الكل
                </button>
              )}
              <button onClick={() => { router.push("/admin/notifications"); setOpen(false); }}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-1)]">
                عرض الكل
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--text-muted)]">جارٍ التحميل...</div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center">
                <HiBell className="mx-auto mb-2 text-3xl text-[var(--text-muted)] opacity-30" />
                <p className="text-sm text-[var(--text-muted)]">لا توجد إشعارات</p>
              </div>
            ) : (
              items.map(n => (
                <button key={n.id} onClick={() => handleClick(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-right transition-colors hover:bg-[var(--bg-page)] ${
                    !n.is_read ? "bg-brand-50/50 dark:bg-brand-900/10" : ""
                  }`}>
                  <span className="mt-0.5 shrink-0 text-lg">{typeIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-tight ${!n.is_read ? "font-semibold text-[var(--text-1)]" : "text-[var(--text-2)]"}`}>
                      {n.title_ar}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)] truncate">{n.message_ar}</p>
                    <p className="mt-1 text-[10px] text-[var(--text-muted)]">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-700" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
