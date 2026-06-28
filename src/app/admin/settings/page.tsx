import Link from "next/link";
import { Settings, CreditCard, Shield, Bell } from "lucide-react";
export default function AdminSettingsPage() {
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold text-[var(--text-1)]">الإعدادات</h1></div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {icon:Settings, title:"إعدادات عامة", desc:"اسم المتجر، العملة، معلومات التواصل", href:"/admin/settings/general"},
          {icon:CreditCard, title:"وسائل الدفع", desc:"تفعيل وضبط طرق الدفع", href:"/admin/settings/payment-providers"},
          {icon:Shield, title:"الأدوار والصلاحيات", desc:"إدارة الموظفين والأدوار", href:"/admin/settings/roles"},
          {icon:Bell, title:"الإشعارات", desc:"إعدادات SMS والواتساب والبريد", href:"/admin/settings/notifications"},
        ].map(({icon:Icon,title,desc,href})=>(
          <Link key={href} href={href} className="card-base flex items-center gap-4 p-5 hover:border-brand-300 transition-all">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-700">
              <Icon size={20}/>
            </div>
            <div>
              <p className="font-semibold text-[var(--text-1)]">{title}</p>
              <p className="text-sm text-[var(--text-muted)]">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
