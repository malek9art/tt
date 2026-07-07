"use client";
import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useAuthStore } from "@/store/authStore";
import { HiBell, HiCheckCircle } from "react-icons/hi2";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Notif {
  id: string;
  type: string;
  title_ar: string;
  message_ar: string;
  payload: { link?: string } | null;
  is_read: boolean;
  created_at: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "الآن";
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  const d = Math.floor(h / 24);
  return `منذ ${d} ${d === 1 ? "يوم" : "أيام"}`;
}

export default function DriverNotificationsPage() {
  const { user } = useAuthStore();
  const [items,   setItems]   = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await sb
      .from("notifications")
      .select("id, type, title_ar, message_ar, payload, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data as Notif[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    if (!user) return;
    await sb.from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unread = items.filter(n => !n.is_read).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-1)]">الإشعارات</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {unread > 0 ? `${unread} إشعار غير مقروء` : "جميع الإشعارات مقروءة"}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead}
            className="btn-ghost border border-[var(--border)] gap-1.5 text-sm">
            <HiCheckCircle className="text-green-500"/> قراءة الكل
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl"/>)}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
          <HiBell className="text-5xl mx-auto mb-3 text-[var(--text-muted)] opacity-40"/>
          <p className="font-medium text-[var(--text-2)]">لا توجد إشعارات بعد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(n => (
            <div key={n.id}
              className={`card-base p-4 flex items-start gap-3 ${!n.is_read ? "border-brand-300 dark:border-brand-700" : ""}`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg ${
                !n.is_read ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-accent-400" : "bg-[var(--bg-page)] text-[var(--text-muted)]"
              }`}>
                <HiBell/>
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.is_read ? "font-bold" : "font-medium"} text-[var(--text-1)]`}>{n.title_ar}</p>
                <p className="text-sm text-[var(--text-2)] mt-0.5">{n.message_ar}</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">{timeAgo(n.created_at)}</p>
              </div>
              {!n.is_read && <span className="h-2 w-2 rounded-full bg-brand-700 dark:bg-accent-500 shrink-0 mt-2"/>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
