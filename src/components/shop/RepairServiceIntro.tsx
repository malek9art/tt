"use client";
import { useStoreSettings } from "@/lib/useStoreSettings";
import { FaWhatsapp } from "react-icons/fa6";
import { HiPhone, HiMagnifyingGlassCircle, HiDocumentText, HiWrenchScrewdriver, HiShieldCheck } from "react-icons/hi2";

const STEPS = [
  { icon: HiMagnifyingGlassCircle, title: "تشخيص مجاني",  desc: "نفحص جهازك ونحدد المشكلة بدقة" },
  { icon: HiDocumentText,          title: "عرض سعر واضح", desc: "تعرف على التكلفة قبل أي إجراء" },
  { icon: HiWrenchScrewdriver,     title: "إصلاح احترافي", desc: "فنيون متخصصون بقطع أصلية" },
  { icon: HiShieldCheck,           title: "ضمان على الإصلاح", desc: "راحة بالك بعد الاستلام" },
];

/**
 * مقدمة قسم الصيانة — تظهر أعلى شبكة المنتجات عند تصفح فئة صيانة الأجهزة.
 * تستبدل الوعد الفارغ بـ"حجز موعد" بشرح واضح للخدمة وزر تواصل مباشر،
 * لأن لا يوجد نظام حجز فعلي بقاعدة بيانات في المتجر حالياً.
 */
export default function RepairServiceIntro() {
  const settings = useStoreSettings();
  const whatsappHref = settings.whatsapp
    ? `https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("مرحباً، أرغب بطلب صيانة لجهازي")}`
    : null;

  return (
    <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-1)]">🛠️ خدمات صيانة الأجهزة</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            تواصل معنا مباشرة لطلب صيانة — سنرد عليك بأقرب وقت لتحديد التفاصيل
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noreferrer"
              className="btn-primary gap-2 bg-green-600 hover:bg-green-700 border-green-600">
              <FaWhatsapp className="text-base"/> تواصل واتساب
            </a>
          )}
          {settings.phone && (
            <a href={`tel:${settings.phone}`}
              className="btn-ghost border border-[var(--border)] gap-2">
              <HiPhone className="text-base"/> اتصل بنا
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STEPS.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex flex-col items-center text-center gap-1.5 rounded-xl bg-[var(--bg-page)] p-3">
            <Icon className="text-2xl text-brand-700 dark:text-accent-400"/>
            <p className="text-xs font-semibold text-[var(--text-1)]">{title}</p>
            <p className="text-[11px] text-[var(--text-muted)] leading-tight">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
