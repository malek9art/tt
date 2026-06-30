"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiSquares2X2, HiArchiveBox, HiShoppingBag, HiUsers,
  HiBuildingStorefront, HiTag, HiChartBar, HiTruck,
  HiCog6Tooth, HiChevronLeft, HiXMark, HiBars3, HiPhoto,
} from "react-icons/hi2";
import { useState } from "react";

const NAV = [
  { href:"/admin",              label:"لوحة التحكم",    icon:HiSquares2X2,        exact:true },
  { href:"/admin/products",     label:"المنتجات",        icon:HiArchiveBox },
  { href:"/admin/orders",       label:"الطلبات",         icon:HiShoppingBag },
  { href:"/admin/customers",    label:"العملاء",         icon:HiUsers },
  { href:"/admin/inventory",    label:"المخزون",         icon:HiBuildingStorefront },
  { href:"/admin/analytics",    label:"التحليلات",       icon:HiChartBar },
  { href:"/admin/marketing",    label:"التسويق والكوبونات",icon:HiTag },
  { href:"/admin/banners",      label:"البنرات الإعلانية",icon:HiPhoto },
  { href:"/admin/drivers",      label:"المناديب",        icon:HiTruck },
  { href:"/admin/settings",     label:"الإعدادات",       icon:HiCog6Tooth },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const Inner = () => (
    <div className="flex h-full flex-col bg-brand-900">
      <div className="flex items-center gap-3 border-b border-brand-800 px-4 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-500 text-brand-900 font-bold text-lg">أ</div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">مركز الأحمدي</p>
          <p className="text-[10px] text-brand-400">لوحة الإدارة</p>
        </div>
        <button onClick={() => setOpen(false)} className="mr-auto md:hidden text-brand-400 hover:text-white">
          <HiXMark className="text-lg"/>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon:Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? "bg-brand-700 text-white" : "text-brand-300 hover:bg-brand-800 hover:text-white"
              }`}>
              <Icon className="text-lg shrink-0"/>
              {label}
              {active && <HiChevronLeft className="text-sm mr-auto"/>}
            </Link>
          );
        })}
      </nav>

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
      <aside className="hidden md:flex w-56 shrink-0 flex-col">
        <Inner/>
      </aside>
      <button onClick={() => setOpen(true)}
        className="fixed bottom-4 start-4 z-40 md:hidden flex h-12 w-12 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg">
        <HiBars3 className="text-xl"/>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)}/>
          <aside className="fixed inset-y-0 start-0 z-50 w-64"><Inner/></aside>
        </>
      )}
    </>
  );
}
