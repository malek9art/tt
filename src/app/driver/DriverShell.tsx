"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { LayoutDashboard, ClipboardList, User, LogOut, Bell } from "lucide-react";

export default function DriverShell({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut } = useAuthStore();

  useEffect(() => {
    if (!loading && !user) router.replace("/driver/login");
  }, [user, loading, router]);

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)]">
      <div className="text-[var(--text-muted)]">جارٍ التحميل...</div>
    </div>
  );

  const nav = [
    { href:"/driver",        label:"الرئيسية", icon:LayoutDashboard, exact:true },
    { href:"/driver/orders", label:"الطلبات",  icon:ClipboardList },
    { href:"/driver/notifications", label:"الإشعارات", icon:Bell },
    { href:"/driver/profile",label:"حسابي",    icon:User },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-page)] pb-16" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-card)] px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500 text-brand-900 font-bold text-sm">أ</div>
          <span className="font-bold text-[var(--text-1)] text-sm">مناديب الأحمدي</span>
        </div>
        <button onClick={() => signOut().then(() => router.replace("/driver/login"))}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <LogOut size={14}/> خروج
        </button>
      </header>

      {/* المحتوى */}
      <main className="container-main py-5 max-w-xl mx-auto">
        {children}
      </main>

      {/* شريط التنقل السفلي */}
      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-[var(--border)] bg-[var(--bg-card)]">
        <div className="flex">
          {nav.map(({ href, label, icon:Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className={`flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors ${
                  active ? "text-brand-700 dark:text-accent-400" : "text-[var(--text-muted)]"
                }`}>
                <Icon size={20}/>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
