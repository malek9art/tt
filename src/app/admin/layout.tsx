import type { Metadata } from "next";
import AdminSidebar from "@/components/admin/layout/AdminSidebar";
import AdminHeader  from "@/components/admin/layout/AdminHeader";

export const metadata: Metadata = {
  title: { default: "لوحة الإدارة", template: "%s | مركز الأحمدي - الإدارة" },
  robots: { index: false, follow: false },
};

// الحماية تتم بالكامل عبر middleware.ts
// لا يوجد تحقق هنا لتجنب redirect loop مع /admin/login
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-page)]" dir="rtl">
      {children}
    </div>
  );
}
