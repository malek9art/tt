"use client";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ShoppingCart, Search, Sun, Moon, Menu, X, Phone } from "lucide-react";
import { useState, useEffect } from "react";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted]   = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMounted(true), []);

  const navLinks = [
    { href: "/products", label: "المنتجات" },
    { href: "/products?cat=smartphones", label: "الهواتف" },
    { href: "/products?cat=accessories", label: "الإكسسوارات" },
    { href: "/products?cat=spare-parts", label: "قطع الغيار" },
    { href: "/products?cat=repair-services", label: "الصيانة" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-brand-700 text-white shadow-lg">
      <div className="bg-brand-900 py-1 text-center text-xs text-brand-100">
        <span className="flex items-center justify-center gap-2">
          <Phone size={12} /> تواصل معنا: 00967-XXXXXXXXX | تعز، اليمن
        </span>
      </div>
      <div className="container-main">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-500 text-brand-900 font-bold text-lg shadow">أ</div>
            <div className="hidden sm:block">
              <div className="text-sm font-bold leading-tight">مركز الأحمدي</div>
              <div className="text-[10px] text-brand-200">للجوالات ومستلزماتها</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(l => (
              <Link key={l.href} href={l.href}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-100 hover:bg-brand-600 hover:text-white transition-colors">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/products" aria-label="بحث"
              className="flex h-9 w-9 items-center justify-center rounded-full text-brand-200 hover:bg-brand-600 hover:text-white transition-colors">
              <Search size={18} />
            </Link>
            {mounted && (
              <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex h-9 w-9 items-center justify-center rounded-full text-brand-200 hover:bg-brand-600 hover:text-white transition-colors">
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}
            <Link href="/cart"
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-brand-200 hover:bg-brand-600 hover:text-white transition-colors">
              <ShoppingCart size={18} />
            </Link>
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="flex md:hidden h-9 w-9 items-center justify-center rounded-full text-brand-200 hover:bg-brand-600">
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>
      {menuOpen && (
        <div className="md:hidden bg-brand-800 px-4 pb-4 pt-2 border-t border-brand-600">
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm text-brand-100 hover:bg-brand-700">
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
