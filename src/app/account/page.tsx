import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { Package, MapPin, User, LogOut } from "lucide-react";

export const metadata = { title: "حسابي" };

export default function AccountPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="container-main py-8 max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold text-[var(--text-1)]">حسابي</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { href: "/account/orders",    icon: Package, title: "طلباتي",    desc: "تتبع وعرض كل طلباتك" },
            { href: "/account/addresses", icon: MapPin,  title: "عناويني",   desc: "إدارة عناوين التوصيل" },
            { href: "/account/profile",   icon: User,    title: "ملف شخصي",  desc: "تعديل بياناتك الشخصية" },
          ].map(({ href, icon: Icon, title, desc }) => (
            <Link key={href} href={href} className="card-base p-5 flex items-center gap-4 hover:border-brand-300 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900 text-brand-700">
                <Icon size={22} />
              </div>
              <div>
                <p className="font-semibold text-[var(--text-1)]">{title}</p>
                <p className="text-sm text-[var(--text-muted)]">{desc}</p>
              </div>
            </Link>
          ))}
          <button className="card-base p-5 flex items-center gap-4 text-right hover:border-red-300 transition-colors">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500">
              <LogOut size={22} />
            </div>
            <div>
              <p className="font-semibold text-red-500">تسجيل الخروج</p>
              <p className="text-sm text-[var(--text-muted)]">الخروج من الحساب</p>
            </div>
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
}
