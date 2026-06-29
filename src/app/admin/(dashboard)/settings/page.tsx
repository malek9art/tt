import Link from "next/link";
import { Settings, CreditCard, Shield, Bell, Store, Palette, ArrowLeft } from "lucide-react";

export const metadata = { title: "الإعدادات" };

const sections = [
  {
    icon:  Store,
    title: "إعدادات المتجر",
    desc:  "الشعار، اسم المتجر، أوقات العمل، وسائل التواصل الاجتماعي",
    href:  "/admin/settings/general",
    ready: true,
  },
  {
    icon:  CreditCard,
    title: "وسائل الدفع",
    desc:  "تفعيل وإدارة COD، جوالي، فلوسك، Stripe",
    href:  "/admin/settings/payment-providers",
    ready: true,
  },
  {
    icon:  Shield,
    title: "الأدوار والصلاحيات",
    desc:  "عرض أدوار النظام وصلاحيات كل دور",
    href:  "/admin/settings/roles",
    ready: true,
  },
  {
    icon:  Bell,
    title: "الإشعارات",
    desc:  "إعدادات البريد الإلكتروني، SMS، وإشعارات الطلبات",
    href:  "/admin/settings/notifications",
    ready: false,
  },
  {
    icon:  Palette,
    title: "مظهر المتجر",
    desc:  "الألوان والخطوط والثيم المخصص",
    href:  "/admin/settings/appearance",
    ready: false,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-1)]">الإعدادات</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">إدارة إعدادات المتجر والنظام</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map(({ icon:Icon, title, desc, href, ready }) =>
          ready ? (
            <Link key={title} href={href}
              className="card-base flex items-start gap-4 p-5 hover:border-brand-300 hover:shadow-sm transition-all group">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-700">
                <Icon size={20}/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[var(--text-1)]">{title}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{desc}</p>
              </div>
              <ArrowLeft size={16} className="shrink-0 text-[var(--text-muted)] group-hover:text-brand-700 transition-colors mt-0.5"/>
            </Link>
          ) : (
            <div key={title}
              className="card-base flex items-start gap-4 p-5 opacity-50 cursor-not-allowed">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--border)] text-[var(--text-muted)]">
                <Icon size={20}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-sm text-[var(--text-1)]">{title}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--border)] text-[var(--text-muted)]">قريباً</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{desc}</p>
              </div>
            </div>
          )
        )}
      </div>

      <div className="card-base p-5">
        <h2 className="font-semibold text-[var(--text-1)] mb-4 flex items-center gap-2">
          <Settings size={15} className="text-brand-700"/> معلومات النظام
        </h2>
        <div className="space-y-2">
          {[
            ["الإصدار",        "Next.js 16.2.9"],
            ["قاعدة البيانات", "Supabase PostgreSQL"],
            ["التخزين",        "Supabase Storage"],
            ["الاستضافة",      "Vercel"],
            ["المصادقة",       "Supabase Auth (Email + Password)"],
            ["URL المتجر",     "https://ahmadi-store.vercel.app"],
          ].map(([k,v]) => (
            <div key={k} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
              <span className="text-sm text-[var(--text-muted)]">{k}</span>
              <span className="text-sm font-medium text-[var(--text-1)]" dir="ltr">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
