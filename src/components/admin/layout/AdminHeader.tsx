"use client";
import { useAuthStore } from "@/store/authStore";
import { useTheme }     from "next-themes";
import { Sun, Moon, LogOut } from "lucide-react";
import { useRouter }    from "next/navigation";
import { useEffect, useState } from "react";
import NotificationsBell from "@/components/admin/NotificationsBell";

export default function AdminHeader() {
  const { theme, setTheme } = useTheme();
  const { user, profile, signOut } = useAuthStore();
  const router   = useRouter();
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/admin/login");
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-card)] px-4 md:px-6">
      <div>
        <p className="text-sm font-semibold text-[var(--text-1)]">
          {new Date().toLocaleDateString("ar-YE", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <NotificationsBell />

        {/* Dark Mode */}
        {m && (
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-2)] hover:bg-[var(--border)] transition-colors">
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        )}

        {/* المستخدم */}
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
            {profile?.full_name?.[0] ?? "م"}
          </div>
          <span className="hidden sm:block text-sm font-medium text-[var(--text-1)]">
            {profile?.full_name ?? "المدير"}
          </span>
        </div>

        {/* خروج */}
        <button onClick={handleSignOut}
          className="flex h-8 w-8 items-center justify-center rounded-full text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
