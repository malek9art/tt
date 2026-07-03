"use client";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useStoreSettings } from "@/lib/useStoreSettings";
import { FaWhatsapp } from "react-icons/fa6";
import { HiPhone } from "react-icons/hi2";

export interface InfoSection {
  title: string;
  body?: string;
  items?: string[];
}

export default function InfoPage({
  title, intro, emoji, sections,
}: { title: string; intro?: string; emoji: string; sections: InfoSection[] }) {
  const settings = useStoreSettings();
  return (
    <div className="min-h-screen">
      <Header />
      <div className="container-main py-10 max-w-3xl">
        <nav className="mb-6 text-sm text-[var(--text-muted)]">
          <Link href="/" className="hover:text-brand-700">الرئيسية</Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--text-1)]">{title}</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-1)] flex items-center gap-3">
            <span>{emoji}</span> {title}
          </h1>
          {intro && (
            <p className="text-[var(--text-2)] mt-3 leading-relaxed">{intro}</p>
          )}
        </div>

        <div className="space-y-6">
          {sections.map((s) => (
            <section key={s.title} className="card-base p-6">
              <h2 className="font-bold text-lg text-[var(--text-1)] mb-3">{s.title}</h2>
              {s.body && (
                <p className="text-sm text-[var(--text-2)] leading-relaxed whitespace-pre-line">{s.body}</p>
              )}
              {s.items && (
                <ul className="space-y-2 mt-2">
                  {s.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--text-2)] leading-relaxed">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 p-6 text-center">
          <p className="font-semibold text-[var(--text-1)] mb-1">لديك سؤال آخر؟</p>
          <p className="text-sm text-[var(--text-muted)] mb-4">فريقنا جاهز لمساعدتك في أي وقت</p>
          <div className="flex flex-wrap justify-center gap-3">
            {settings.whatsapp && (
              <a href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, "")}`}
                target="_blank" rel="noreferrer"
                className="btn-primary inline-flex items-center gap-2">
                <FaWhatsapp /> واتساب
              </a>
            )}
            {settings.phone && (
              <a href={`tel:${settings.phone}`}
                className="btn-ghost border border-[var(--border)] inline-flex items-center gap-2">
                <HiPhone /> اتصل بنا
              </a>
            )}
            {!settings.whatsapp && !settings.phone && (
              <Link href="/products" className="btn-primary inline-flex">تصفح المنتجات</Link>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
