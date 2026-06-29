import Link from "next/link";
import { Settings, CreditCard, Shield, Bell, Store, Palette } from "lucide-react";

export const metadata = { title: "الإعدادات" };

const sections = [
  {
    icon: Store,
    title: "إعدادات المتجر",
    desc: "اسم المتجر، العملة، معلومات التواصل",
    href: "/admin/settings/general",
    badge: "قريباً",
  },
  {
    icon: CreditCard,
    title: "وسائل الدفع",
    desc: "تفعيل وضبط COD / جوالي / جيب / Stripe",
    href: "/admin/settings/payment-providers",
    badge: "قريباً",
  },
  {
    icon: Shield,
    title: "الأدوار والصلاحيات",
    desc: "إدارة الموظفين وصلاحيات الوصول",
    href: "/admin/settings/roles",
    badge: "قريباً",
  },
  {
    icon: Bell,
    title: "الإشعارات",
    desc: "إعدادات البريد الإلكتروني والـ SMS",
    href: "/admin/settings/notifications",
    badge: "قريباً",
  },
  {
    icon: Palette,
    title: "مظهر المتجر",
    desc: "الألوان والشعار والخطوط",
    href: "/admin/settings/appearance",
    badge: "قريباً",
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-1)]">الإعدادات</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          إدارة إعدادات المتجر والنظام
        </p>
      </div>

      {/* معلومات النظام */}
      <div className="card-base p-5">
        <h2 className="font-semibold text-[var(--text-1)] mb-4 flex items-center gap-2">
          <Settings size={16} className="text-brand-700" />
          معلومات النظام
        </h2>
        <div className="grid gap-3 text-sm">
          {[
            ["اسم المتجر",   "مركز الأحمدي للجوالات ومستلزماتها"],
            ["الموقع",       "تعز، اليمن"],
            ["العملة",       "YER — ريال يمني"],
            ["Framework",   "Next.js 16.2.9"],
            ["Database",    "Supabase (PostgreSQL)"],
            ["Hosting",     "Vercel"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
              <span className="text-[var(--text-muted)]">{k}</span>
              <span className="font-medium text-[var(--text-1)]" dir="ltr">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* أقسام الإعدادات */}
      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map(({ icon: Icon, title, desc, badge }) => (
          <div key={title}
            className="card-base flex items-start gap-4 p-4 opacity-70 cursor-not-allowed">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-700">
              <Icon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-[var(--text-1)] text-sm">{title}</p>
                <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px]">
                  {badge}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
