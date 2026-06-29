import Link from "next/link";
import { Settings, CreditCard, Shield, Bell, Store, Palette } from "lucide-react";

export const metadata = { title: "الإعدادات" };

const sections = [
  {
    icon:  Store,
    title: "إعدادات المتجر",
    desc:  "الشعار، اسم المتجر، أوقات العمل، وسائل التواصل",
    href:  "/admin/settings/general",
    badge: null,
  },
  {
    icon:  CreditCard,
    title: "وسائل الدفع",
    desc:  "تفعيل COD، جوالي، فلوسك، Stripe",
    href:  "/admin/settings/payment-providers",
    badge: null,
  },
  {
    icon:  Shield,
    title: "الأدوار والصلاحيات",
    desc:  "إدارة صلاحيات الموظفين والمناديب",
    href:  "/admin/settings/roles",
    badge: null,
  },
  {
    icon:  Bell,
    title: "الإشعارات",
    desc:  "إعدادات البريد الإلكتروني والتنبيهات",
    href:  "/admin/settings/notifications",
    badge: "قريباً",
  },
  {
    icon:  Palette,
    title: "مظهر المتجر",
    desc:  "الألوان، الخطوط، الثيم",
    href:  "/admin/settings/appearance",
    badge: "قريباً",
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-1)]">الإعدادات</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">إدارة إعدادات المتجر والنظام</p>
      </div>

      {/* بطاقات الأقسام */}
      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map(({ icon:Icon, title, desc, href, badge }) => {
          const content = (
            <div className={`card-base flex items-start gap-4 p-5 transition-all ${
              badge ? "opacity-60 cursor-not-allowed" : "hover:border-brand-300 hover:shadow-sm"
            }`}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-700">
                <Icon size={20}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-sm text-[var(--text-1)]">{title}</p>
                  {badge && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      {badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{desc}</p>
              </div>
            </div>
          );
          return badge
            ? <div key={title}>{content}</div>
            : <Link key={title} href={href}>{content}</Link>;
        })}
      </div>

      {/* معلومات النظام */}
      <div className="card-base p-5">
        <h2 className="font-semibold text-[var(--text-1)] mb-4 flex items-center gap-2">
          <Settings size={15} className="text-brand-700"/> معلومات النظام
        </h2>
        <div className="space-y-2">
          {[
            ["الإصدار",     "Next.js 16.2.9 + Supabase"],
            ["الاستضافة",   "Vercel (Hobby)"],
            ["قاعدة البيانات","PostgreSQL (Supabase)"],
            ["التخزين",     "Supabase Storage"],
            ["المصادقة",    "Supabase Auth"],
            ["URL المتجر",  "https://ahmadi-store.vercel.app"],
          ].map(([k, v]) => (
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
