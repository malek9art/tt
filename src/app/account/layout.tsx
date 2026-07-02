"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { User, ShoppingBag, MapPin, Heart, LogOut, ChevronLeft, Bell } from "lucide-react";

const NAV = [
  { href:"/account",            label:"نظرة عامة",      icon:User,        exact:true },
  { href:"/account/orders",     label:"طلباتي",          icon:ShoppingBag },
  { href:"/account/profile",    label:"الملف الشخصي",   icon:User },
  { href:"/account/addresses",  label:"عناوين التوصيل", icon:MapPin },
  { href:"/account/wishlist",   label:"قائمة الأمنيات", icon:Heart },
  { href:"/account/notifications", label:"الإشعارات",    icon:Bell },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, profile, signOut, loading } = useAuthStore();

  useEffect(() => {
    if (!loading && !user) router.replace("/login?redirectTo=/account");
  }, [user, loading, router]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  if (loading || !user) return (
    <div className="min-h-screen">
      <Header/>
      <div className="container-main py-20 flex justify-center">
        <div className="skeleton h-64 w-full max-w-3xl rounded-xl"/>
      </div>
      <Footer/>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Header/>
      <div className="container-main py-8">
        <div className="grid gap-6 md:grid-cols-4">
          {/* السايدبار */}
          <aside className="md:col-span-1">
            <div className="card-base overflow-hidden">
              {/* معلومات المستخدم */}
              <div className="bg-gradient-to-b from-brand-700 to-brand-800 p-5 text-center">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-white">
                  {profile?.full_name?.[0] ?? user.email?.[0]?.toUpperCase() ?? "م"}
                </div>
                <p className="font-bold text-white">{profile?.full_name ?? "المستخدم"}</p>
                <p className="text-xs text-brand-200 mt-0.5 truncate">{user.email}</p>
              </div>

              {/* التنقل */}
              <nav className="p-2">
                {NAV.map(({ href, label, icon:Icon, exact }) => (
                  <Link key={href} href={href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive(href, exact)
                        ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-accent-400"
                        : "text-[var(--text-2)] hover:bg-[var(--bg-page)]"
                    }`}>
                    <Icon size={16} className="shrink-0"/>
                    {label}
                    {isActive(href, exact) && <ChevronLeft size={13} className="mr-auto"/>}
                  </Link>
                ))}
                <button onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-1">
                  <LogOut size={16} className="shrink-0"/>
                  تسجيل الخروج
                </button>
              </nav>
            </div>
          </aside>

          {/* المحتوى */}
          <main className="md:col-span-3">{children}</main>
        </div>
      </div>
      <Footer/>
    </div>
  );
}
