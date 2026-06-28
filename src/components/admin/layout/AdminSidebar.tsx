"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingBag, Users,
  Warehouse, Tag, BarChart3, Settings, ChevronLeft, X
} from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";

const NAV = [
  { href: "/admin",            label: "لوحة التحكم",   icon: LayoutDashboard, exact: true },
  { href: "/admin/products",   label: "المنتجات",       icon: Package },
  { href: "/admin/orders",     label: "الطلبات",        icon: ShoppingBag },
  { href: "/admin/customers",  label: "العملاء",        icon: Users },
  { href: "/admin/inventory",  label: "المخزون",        icon: Warehouse },
  { href: "/admin/marketing",  label: "التسويق",        icon: Tag },
  { href: "/admin/analytics",  label: "التحليلات",      icon: BarChart3 },
  { href: "/admin/settings",   label: "الإعدادات",      icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-brand-900">
      {/* الشعار */}
      <div className="flex items-center gap-3 border-b border-brand-800 px-4 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-500 text-brand-900 font-bold text-lg">أ</div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">مركز الأحمدي</p>
          <p className="text-[10px] text-brand-400">لوحة الإدارة</p>
        </div>
        <button onClick={() => setOpen(false)} className="mr-auto md:hidden text-brand-400 hover:text-white">
          <X size={18} />
        </button>
      </div>

      {/* قائمة التنقل */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-700 text-white"
                  : "text-brand-300 hover:bg-brand-800 hover:text-white"
              )}>
              <Icon size={18} className="shrink-0" />
              {label}
              {active && <ChevronLeft size={14} className="mr-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* رابط المتجر */}
      <div className="border-t border-brand-800 p-3">
        <Link href="/" target="_blank"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-brand-400 hover:text-white transition-colors">
          ← عرض المتجر
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile Toggle */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 start-4 z-40 md:hidden flex h-12 w-12 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg">
        <LayoutDashboard size={20} />
      </button>

      {/* Mobile Drawer */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="fixed inset-y-0 start-0 z-50 w-64">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
