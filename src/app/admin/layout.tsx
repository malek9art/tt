import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { createSupabaseServer } from "@/lib/supabase-server";
import AdminSidebar from "@/components/admin/layout/AdminSidebar";
import AdminHeader  from "@/components/admin/layout/AdminHeader";

export const metadata: Metadata = {
  title: { default: "لوحة الإدارة", template: "%s | مركز الأحمدي - الإدارة" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // تحقق من الجلسة على مستوى السيرفر
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

  // تحقق من صلاحيات الإدارة
  const supabase = await createSupabaseServer();
  const { data: isAdmin } = await supabase.rpc("has_permission", {
    _user_id: user.id,
    _perm: "products:read",
  });

  if (!isAdmin) {
    redirect("/admin/login?error=unauthorized");
  }

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
