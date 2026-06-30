"use client";
import Link from "next/link";
import Image from "next/image";
import { HiPhone, HiEnvelope, HiMapPin, HiClock } from "react-icons/hi2";
import { FaFacebookF, FaInstagram, FaXTwitter, FaWhatsapp, FaTiktok, FaYoutube } from "react-icons/fa6";
import { useStoreSettings } from "@/lib/useStoreSettings";

export default function Footer() {
  const s = useStoreSettings();

  const socials = [
    { key: "facebook",  href: s.facebook,  Icon: FaFacebookF,  color: "hover:bg-[#1877F2]" },
    { key: "instagram", href: s.instagram, Icon: FaInstagram,  color: "hover:bg-gradient-to-br hover:from-[#833AB4] hover:via-[#FD1D1D] hover:to-[#F77737]" },
    { key: "twitter",   href: s.twitter,   Icon: FaXTwitter,   color: "hover:bg-black dark:hover:bg-white dark:hover:text-black" },
    { key: "whatsapp",  href: s.whatsapp ? `https://wa.me/${s.whatsapp.replace(/[^0-9]/g,"")}` : null, Icon: FaWhatsapp, color: "hover:bg-[#25D366]" },
  ].filter(x => x.href);

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
                <div className="text-sm font-bold text-white leading-tight">{s.name || "مركز الأحمدي"}</div>
                {s.tagline && <div className="text-xs text-brand-300">{s.tagline}</div>}
              </div>
            </div>
            <p className="text-sm text-brand-300 leading-relaxed mb-5">
              وجهتك الأولى للجوالات والإكسسوارات في اليمن. أفضل الأسعار وأعلى جودة مع ضمان أصلي.
            </p>
            {/* السوشال ميديا */}
            {socials.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {socials.map(({ key, href, Icon, color }) => (
                  <a key={key} href={href!} target="_blank" rel="noreferrer"
                    className={`flex h-8 w-8 items-center justify-center rounded-lg bg-brand-800 text-brand-300 hover:text-white transition-all ${color}`}>
                    <Icon size={14}/>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* روابط سريعة */}
          <div>
            <h3 className="mb-4 font-semibold text-white text-sm border-b border-brand-800 pb-2">روابط سريعة</h3>
            <ul className="space-y-2 text-sm">
              {[
                { href:"/products",                 label:"جميع المنتجات" },
                { href:"/products?cat=phones",      label:"الهواتف الذكية" },
                { href:"/products?cat=accessories", label:"الإكسسوارات" },
                { href:"/products?cat=spare-parts", label:"قطع الغيار" },
                { href:"/track",                    label:"تتبع طلبك" },
                { href:"/account",                  label:"حسابي" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-brand-300 hover:text-accent-400 transition-colors flex items-center gap-1.5 group">
                    <span className="h-px w-3 bg-brand-700 group-hover:bg-accent-500 transition-colors"/>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* خدمة العملاء */}
          <div>
            <h3 className="mb-4 font-semibold text-white text-sm border-b border-brand-800 pb-2">خدمة العملاء</h3>
            <ul className="space-y-2 text-sm">
              {[
                { href:"/faq",             label:"الأسئلة الشائعة" },
                { href:"/shipping-policy", label:"سياسة الشحن" },
                { href:"/return-policy",   label:"سياسة الإرجاع" },
                { href:"/privacy",         label:"سياسة الخصوصية" },
                { href:"/terms",           label:"شروط الاستخدام" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-brand-300 hover:text-accent-400 transition-colors flex items-center gap-1.5 group">
                    <span className="h-px w-3 bg-brand-700 group-hover:bg-accent-500 transition-colors"/>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* معلومات التواصل */}
          <div>
            <h3 className="mb-4 font-semibold text-white text-sm border-b border-brand-800 pb-2">تواصل معنا</h3>
            <ul className="space-y-3 text-sm">
              {s.phone && (
                <li>
                  <a href={`tel:${s.phone}`}
                    className="flex items-center gap-2.5 text-brand-300 hover:text-accent-400 transition-colors group">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-800 group-hover:bg-accent-500/20 transition-colors">
                      <HiPhone className="text-accent-500 text-sm"/>
                    </span>
                    <span dir="ltr">{s.phone}</span>
                  </a>
                </li>
              )}
              {s.whatsapp && (
                <li>
                  <a href={`https://wa.me/${s.whatsapp.replace(/[^0-9]/g,"")}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-2.5 text-brand-300 hover:text-accent-400 transition-colors group">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-800 group-hover:bg-green-500/20 transition-colors">
                      <FaWhatsapp className="text-green-400 text-sm"/>
                    </span>
                    <span dir="ltr">{s.whatsapp}</span>
                  </a>
                </li>
              )}
              {s.email && (
                <li>
                  <a href={`mailto:${s.email}`}
                    className="flex items-center gap-2.5 text-brand-300 hover:text-accent-400 transition-colors group">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-800 group-hover:bg-accent-500/20 transition-colors">
                      <HiEnvelope className="text-accent-500 text-sm"/>
                    </span>
                    <span dir="ltr">{s.email}</span>
                  </a>
                </li>
              )}
              {s.address && (
                <li className="flex items-start gap-2.5 text-brand-300">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-800 shrink-0">
                    <HiMapPin className="text-accent-500 text-sm"/>
                  </span>
                  <span className="leading-relaxed pt-1">{s.address}</span>
                </li>
              )}
              {s.working_hours && (
                <li className="flex items-center gap-2.5 text-brand-300">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-800">
                    <HiClock className="text-accent-500 text-sm"/>
                  </span>
                  <span>{s.working_hours}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* شعارات وسائل الدفع */}
        <div className="mt-10 border-t border-brand-800 pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-brand-500">© {new Date().getFullYear()} {s.name || "مركز الأحمدي"} — جميع الحقوق محفوظة</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-brand-600 ml-1">طرق الدفع:</span>
              {["COD", "جوالي", "جيب", "فلوسك"].map(m => (
                <span key={m} className="rounded border border-brand-700 px-2 py-0.5 text-[10px] text-brand-400 bg-brand-800">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
