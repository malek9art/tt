"use client";
import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, MapPin, Clock, MessageSquare, Globe } from "lucide-react";
import { useStoreSettings } from "@/lib/useStoreSettings";

export default function Footer() {
  const s = useStoreSettings();

  return (
    <footer className="mt-20 border-t border-[var(--border)] bg-brand-900 text-brand-100" dir="rtl">
      <div className="container-main py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">

          {/* الشعار والوصف */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              {s.logo_url ? (
                <div className="relative h-10 w-10 overflow-hidden rounded-xl">
                  <Image src={s.logo_url} alt={s.name} fill sizes="40px" className="object-contain"/>
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500 text-brand-900 font-bold text-lg">أ</div>
              )}
              <div>
                <div className="text-sm font-bold text-white leading-tight">{s.name}</div>
                <div className="text-xs text-brand-300">{s.tagline}</div>
              </div>
            </div>
            <p className="text-sm text-brand-300 leading-relaxed mb-4">
              وجهتك الأولى للجوالات والإكسسوارات في اليمن. أفضل الأسعار وأعلى جودة.
            </p>
            {/* السوشال ميديا */}
            <div className="flex gap-2">
              {s.facebook && (
                <a href={s.facebook} target="_blank" rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-800 text-brand-300 hover:bg-accent-500 hover:text-brand-900 transition-all">
                  <Globe size={14}/>
                </a>
              )}
              {s.instagram && (
                <a href={s.instagram} target="_blank" rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-800 text-brand-300 hover:bg-accent-500 hover:text-brand-900 transition-all">
                  <Globe size={14}/>
                </a>
              )}
              {s.twitter && (
                <a href={s.twitter} target="_blank" rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-800 text-brand-300 hover:bg-accent-500 hover:text-brand-900 transition-all">
                  <Globe size={14}/>
                </a>
              )}
              {s.whatsapp && (
                <a href={`https://wa.me/${s.whatsapp.replace(/[^0-9]/g,"")}`} target="_blank" rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-800 text-brand-300 hover:bg-green-500 hover:text-white transition-all">
                  <MessageSquare size={14}/>
                </a>
              )}
            </div>
          </div>

          {/* روابط سريعة */}
          <div>
            <h3 className="mb-4 font-semibold text-white text-sm">روابط سريعة</h3>
            <ul className="space-y-2 text-sm">
              {[
                { href:"/products",          label:"جميع المنتجات" },
                { href:"/products?cat=phones",label:"الهواتف الذكية" },
                { href:"/products?cat=accessories",label:"الإكسسوارات" },
                { href:"/track",             label:"تتبع طلبك" },
                { href:"/account",           label:"حسابي" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-brand-300 hover:text-accent-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* خدمة العملاء */}
          <div>
            <h3 className="mb-4 font-semibold text-white text-sm">خدمة العملاء</h3>
            <ul className="space-y-2 text-sm">
              {[
                { href:"/faq",              label:"الأسئلة الشائعة" },
                { href:"/shipping-policy",  label:"سياسة الشحن" },
                { href:"/return-policy",    label:"سياسة الإرجاع" },
                { href:"/privacy",          label:"سياسة الخصوصية" },
                { href:"/terms",            label:"شروط الاستخدام" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-brand-300 hover:text-accent-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* معلومات التواصل */}
          <div>
            <h3 className="mb-4 font-semibold text-white text-sm">تواصل معنا</h3>
            <ul className="space-y-3 text-sm">
              {s.phone && (
                <li>
                  <a href={`tel:${s.phone}`}
                    className="flex items-center gap-2 text-brand-300 hover:text-accent-400 transition-colors">
                    <Phone size={14} className="shrink-0 text-accent-500"/>
                    <span dir="ltr">{s.phone}</span>
                  </a>
                </li>
              )}
              {s.whatsapp && (
                <li>
                  <a href={`https://wa.me/${s.whatsapp.replace(/[^0-9]/g,"")}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-brand-300 hover:text-accent-400 transition-colors">
                    <MessageSquare size={14} className="shrink-0 text-accent-500"/>
                    <span dir="ltr">{s.whatsapp}</span>
                  </a>
                </li>
              )}
              {s.email && (
                <li>
                  <a href={`mailto:${s.email}`}
                    className="flex items-center gap-2 text-brand-300 hover:text-accent-400 transition-colors">
                    <Mail size={14} className="shrink-0 text-accent-500"/>
                    <span dir="ltr">{s.email}</span>
                  </a>
                </li>
              )}
              {s.address && (
                <li className="flex items-start gap-2 text-brand-300">
                  <MapPin size={14} className="shrink-0 text-accent-500 mt-0.5"/>
                  <span>{s.address}</span>
                </li>
              )}
              {s.working_hours && (
                <li className="flex items-center gap-2 text-brand-300">
                  <Clock size={14} className="shrink-0 text-accent-500"/>
                  <span>{s.working_hours}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* الحقوق */}
        <div className="mt-10 border-t border-brand-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-brand-500">
          <p>© {new Date().getFullYear()} {s.name} — جميع الحقوق محفوظة</p>
          <p dir="ltr">تعز، اليمن</p>
        </div>
      </div>
    </footer>
  );
}
