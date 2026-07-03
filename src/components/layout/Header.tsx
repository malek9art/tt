"use client";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useState, useEffect, useRef } from "react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { useStoreSettings } from "@/lib/useStoreSettings";
import { useRouter } from "next/navigation";
import {
  HiShoppingCart, HiMagnifyingGlass, HiSun, HiMoon,
  HiBars3, HiXMark, HiPhone, HiUser, HiArrowRightOnRectangle,
} from "react-icons/hi2";
import { FaWhatsapp } from "react-icons/fa6";

const NAV = [
  { href: "/",                        label: "الرئيسية"    },
  { href: "/products",                label: "المنتجات"    },
  { href: "/products?cat=smartphones",label: "هواتف"       },
  { href: "/products?cat=accessories",label: "إكسسوارات"  },
  { href: "/products?cat=spare-parts",label: "قطع الغيار" },
];

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted,   setMounted]   = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [userMenu,  setUserMenu]  = useState(false);
  const [searchOpen,setSearchOpen]= useState(false);
  const [query,     setQuery]     = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const { totalItems, toggleCart } = useCartStore();
  const { user, profile, signOut } = useAuthStore();
  const settings = useStoreSettings();
  const router   = useRouter();

  useEffect(() => setMounted(true), []);
  const count = mounted ? totalItems() : 0;

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const handleSignOut = async () => {
    await signOut();
    setUserMenu(false);
    router.replace("/");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/products?q=${encodeURIComponent(query.trim())}`);
    setSearchOpen(false);
    setQuery("");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg-card)]/95 backdrop-blur-md" dir="rtl">
      <div className="container-main flex h-16 items-center justify-between gap-3">

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

        {/* شريط البحث — ديسكتوب */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-sm mx-4">
          <div className="relative w-full">
            <HiMagnifyingGlass className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-base pointer-events-none"/>
            <input
              type="search" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="ابحث عن منتج..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-main)] pe-9 ps-4 py-2 text-sm text-[var(--text-1)] placeholder:text-[var(--text-muted)] focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-700 transition-all"
            />
          </div>
        </form>

        {/* التنقل — ديسكتوب */}
        <nav className="hidden lg:flex items-center gap-0.5 shrink-0">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-2)] hover:bg-[var(--border)] hover:text-[var(--text-1)] transition-colors whitespace-nowrap">
              {label}
            </Link>
          ))}
        </nav>

        {/* أيقونات يمين */}
        <div className="flex items-center gap-1 shrink-0">

          {/* رقم الهاتف */}
          {settings.phone && (
            <a href={`tel:${settings.phone}`}
              className="hidden xl:flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-2)] hover:border-brand-300 transition-colors"
              dir="ltr">
              <HiPhone className="text-brand-700 text-sm"/>
              {settings.phone}
            </a>
          )}

          {/* بحث — جوال */}
          <button onClick={() => setSearchOpen(!searchOpen)} aria-label="بحث"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-2)] hover:bg-[var(--border)] transition-colors md:hidden">
            <HiMagnifyingGlass className="text-lg"/>
          </button>

          {/* Dark Mode */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-2)] hover:bg-[var(--border)] transition-colors">
              {theme === "dark" ? <HiSun className="text-lg"/> : <HiMoon className="text-lg"/>}
            </button>
          )}

          {/* السلة */}
          <button onClick={toggleCart} aria-label={`السلة${count > 0 ? ` — ${count} منتج` : ""}`}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-2)] hover:bg-[var(--border)] transition-colors">
            <HiShoppingCart className="text-lg"/>
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
                  <div className="absolute end-0 top-11 z-20 min-w-48 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-1.5 shadow-xl">
                    <div className="border-b border-[var(--border)] px-4 py-2.5 mb-1">
                      <p className="text-sm font-semibold text-[var(--text-1)] truncate">
                        {profile?.full_name ?? "مستخدم"}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
                    </div>
                    {[
                      { href:"/account",           label:"حسابي",             icon:"🏠" },
                      { href:"/account/orders",    label:"طلباتي",            icon:"📦" },
                      { href:"/account/wishlist",  label:"المفضلة",           icon:"❤️" },
                      { href:"/account/profile",   label:"الملف الشخصي",     icon:"👤" },
                      { href:"/account/addresses", label:"عناوين التوصيل",   icon:"📍" },
                    ].map(({ href, label, icon }) => (
                      <Link key={href} href={href} onClick={() => setUserMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--text-1)] hover:bg-[var(--border)] transition-colors">
                        <span className="text-base">{icon}</span>{label}
                      </Link>
                    ))}
                    <div className="border-t border-[var(--border)] mt-1 pt-1">
                      <button onClick={handleSignOut}
                        className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <HiArrowRightOnRectangle className="text-base"/> تسجيل الخروج
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link href="/login"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-2)] hover:bg-[var(--border)] transition-colors">
              <HiUser className="text-lg"/>
            </Link>
          )}

          {/* قائمة جوال */}
          <button onClick={() => setMenuOpen(!menuOpen)} aria-label="القائمة"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-2)] hover:bg-[var(--border)] transition-colors lg:hidden">
            {menuOpen ? <HiXMark className="text-lg"/> : <HiBars3 className="text-lg"/>}
          </button>
        </div>
      </div>

      {/* شريط البحث — جوال */}
      {searchOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <HiMagnifyingGlass className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-base pointer-events-none"/>
              <input
                ref={searchRef}
                type="search" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="ابحث عن منتج..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-main)] pe-9 ps-4 py-2.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-muted)] focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-700 transition-all"
              />
            </div>
          </form>
        </div>
      )}

      {/* القائمة المنسدلة للجوال */}
      {menuOpen && (
        <div className="lg:hidden border-t border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 space-y-1">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--text-1)] hover:bg-[var(--border)] transition-colors">
              {label}
            </Link>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            {settings.phone && (
              <a href={`tel:${settings.phone}`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-2)] hover:bg-[var(--border)] rounded-lg transition-colors"
                dir="ltr">
                <HiPhone className="text-brand-700"/>
                {settings.phone}
              </a>
            )}
            {settings.whatsapp && (
              <a href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g,"")}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-2)] hover:bg-[var(--border)] rounded-lg transition-colors"
                dir="ltr">
                <FaWhatsapp className="text-green-500"/>
                واتساب
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
