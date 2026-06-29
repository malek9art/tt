"use client";
import Link from "next/link";
import Image from "next/image";
import { useTheme }     from "next-themes";
import { ShoppingCart, Search, Sun, Moon, Menu, X, Phone, User, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useCartStore }      from "@/store/cartStore";
import { useAuthStore }      from "@/store/authStore";
import { useStoreSettings }  from "@/lib/useStoreSettings";
import { useRouter }         from "next/navigation";

const NAV = [
  { href:"/",              label:"الرئيسية"      },
  { href:"/products",      label:"المنتجات"       },
  { href:"/products?cat=phones",      label:"هواتف"   },
  { href:"/products?cat=accessories", label:"إكسسوارات"},
];

export default function Header() {
  const { theme, setTheme }   = useTheme();
  const [mounted,   setMounted]   = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [userMenu,  setUserMenu]  = useState(false);
  const { totalItems, toggleCart } = useCartStore();
  const { user, profile, signOut } = useAuthStore();
  const settings = useStoreSettings();
  const router   = useRouter();

  useEffect(() => setMounted(true), []);
  const count = mounted ? totalItems() : 0;

  const handleSignOut = async () => {
    await signOut();
    setUserMenu(false);
    router.replace("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg-card)]/95 backdrop-blur-md" dir="rtl">
      <div className="container-main flex h-16 items-center justify-between gap-4">

        {/* الشعار */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          {settings.logo_url ? (
            <div className="relative h-10 w-10 overflow-hidden rounded-xl">
              <Image src={settings.logo_url} alt={settings.name}
                fill sizes="40px" className="object-contain"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}/>
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-accent-500 font-bold text-xl shadow-sm">
              أ
            </div>
          )}
          <div className="hidden sm:block">
            <div className="text-sm font-bold text-[var(--text-1)] leading-tight">
              {settings.name || "مركز الأحمدي"}
            </div>
            {settings.tagline && (
              <div className="text-[10px] text-[var(--text-muted)]">{settings.tagline}</div>
            )}
          </div>
        </Link>

        {/* التنقل — ديسكتوب */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-2)] hover:bg-[var(--border)] hover:text-[var(--text-1)] transition-colors">
              {label}
            </Link>
          ))}
        </nav>

        {/* أيقونات يمين */}
        <div className="flex items-center gap-1">
          {/* رقم الهاتف — ديسكتوب */}
          {settings.phone && (
            <a href={`tel:${settings.phone}`}
              className="hidden lg:flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-2)] hover:border-brand-300 transition-colors"
              dir="ltr">
              <Phone size={12} className="text-brand-700"/>
              {settings.phone}
            </a>
          )}

          {/* Dark Mode */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-2)] hover:bg-[var(--border)] transition-colors">
              {theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}
            </button>
          )}

          {/* السلة */}
          <button onClick={toggleCart}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-2)] hover:bg-[var(--border)] transition-colors">
            <ShoppingCart size={18}/>
            {count > 0 && (
              <span className="absolute -top-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-500 text-[9px] font-bold text-brand-900">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>

          {/* المستخدم */}
          {user ? (
            <div className="relative">
              <button onClick={() => setUserMenu(!userMenu)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white hover:bg-brand-800 transition-colors">
                {profile?.full_name?.[0] ?? user.email?.[0]?.toUpperCase() ?? "م"}
              </button>
              {userMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenu(false)}/>
                  <div className="absolute end-0 top-11 z-20 min-w-44 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-1.5 shadow-xl">
                    <div className="border-b border-[var(--border)] px-4 py-2.5 mb-1">
                      <p className="text-sm font-semibold text-[var(--text-1)] truncate">
                        {profile?.full_name ?? "مستخدم"}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
                    </div>
                    {[
                      { href:"/account",           label:"حسابي" },
                      { href:"/account/orders",    label:"طلباتي" },
                      { href:"/account/profile",   label:"الملف الشخصي" },
                      { href:"/account/addresses", label:"عناوين التوصيل" },
                    ].map(({ href, label }) => (
                      <Link key={href} href={href} onClick={() => setUserMenu(false)}
                        className="block px-4 py-2 text-sm text-[var(--text-1)] hover:bg-[var(--border)] transition-colors">
                        {label}
                      </Link>
                    ))}
                    <div className="border-t border-[var(--border)] mt-1 pt-1">
                      <button onClick={handleSignOut}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <LogOut size={13}/> تسجيل الخروج
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link href="/login"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-2)] hover:bg-[var(--border)] transition-colors">
              <User size={18}/>
            </Link>
          )}

          {/* قائمة جوال */}
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-2)] hover:bg-[var(--border)] transition-colors md:hidden">
            {menuOpen ? <X size={18}/> : <Menu size={18}/>}
          </button>
        </div>
      </div>

      {/* القائمة المنسدلة للجوال */}
      {menuOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 space-y-1">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--text-1)] hover:bg-[var(--border)] transition-colors">
              {label}
            </Link>
          ))}
          {settings.phone && (
            <a href={`tel:${settings.phone}`}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--text-2)] hover:bg-[var(--border)] rounded-lg transition-colors"
              dir="ltr">
              <Phone size={14} className="text-brand-700"/>
              {settings.phone}
            </a>
          )}
        </div>
      )}
    </header>
  );
}
