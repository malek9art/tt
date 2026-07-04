"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { Package, MapPin, User, LogOut, ChevronLeft, ShieldCheck } from "lucide-react";

export default function AccountPage() {
  const router          = useRouter();
  const { user, profile, signOut, loading } = useAuthStore();

  useEffect(() => {
    // ننتظر تحميل الجلسة أولاً — وإلا يُقذف المستخدم المسجّل إلى صفحة الدخول
    if (!loading && !user) router.replace("/login?redirectTo=/account");
  }, [user, loading, router]);

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  const initial = profile?.full_name?.[0] ?? user.phone?.[3] ?? "م";

  return (
    <div className="space-y-5">
      {/* بطاقة المستخدم */}
      <div className="card-base p-5 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-700 text-2xl font-bold text-white shadow">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
            : initial}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-[var(--text-1)] text-lg leading-tight">
            {profile?.full_name || "مستخدم الأحمدي"}
          </p>
          <p className="text-sm text-[var(--text-muted)]" dir="ltr">{user.phone}</p>
        </div>
        <ShieldCheck size={20} className="mr-auto shrink-0 text-green-500" />
      </div>

      {/* روابط الحساب */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-1)] mb-4">إدارة الحساب</h1>
        <div className="space-y-2">
          {[
            { href: "/account/orders",    icon: Package, title: "طلباتي",         desc: "تتبع وعرض كل طلباتك",     color: "bg-blue-50 dark:bg-blue-900/20 text-blue-600" },
            { href: "/account/addresses", icon: MapPin,  title: "عناوين التوصيل", desc: "إضافة وإدارة عناوينك",     color: "bg-green-50 dark:bg-green-900/20 text-green-600" },
            { href: "/account/profile",   icon: User,    title: "الملف الشخصي",   desc: "تعديل الاسم وبياناتك",     color: "bg-purple-50 dark:bg-purple-900/20 text-purple-600" },
          ].map(({ href, icon: Icon, title, desc, color }) => (
            <Link key={href} href={href}
              className="card-base flex items-center gap-4 p-4 hover:border-brand-300 transition-all group">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
                <Icon size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[var(--text-1)]">{title}</p>
                <p className="text-sm text-[var(--text-muted)]">{desc}</p>
              </div>
              <ChevronLeft size={16} className="text-[var(--text-muted)] group-hover:text-brand-700 transition-colors" />
            </Link>
          ))}

          {/* تسجيل الخروج */}
          <button onClick={handleSignOut}
            className="w-full card-base flex items-center gap-4 p-4 hover:border-red-300 transition-all group text-right">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500">
              <LogOut size={20} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-red-500">تسجيل الخروج</p>
              <p className="text-sm text-[var(--text-muted)]">الخروج من حسابك</p>
            </div>
            <ChevronLeft size={16} className="text-[var(--text-muted)] group-hover:text-red-500 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
}
