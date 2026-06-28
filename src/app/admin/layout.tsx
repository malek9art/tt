import type { Metadata } from "next";
import AdminSidebar from "@/components/admin/layout/AdminSidebar";
import AdminHeader  from "@/components/admin/layout/AdminHeader";

export const metadata: Metadata = {
  title: { default: "لوحة الإدارة", template: "%s | مركز الأحمدي - الإدارة" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-page)]" dir="rtl">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
