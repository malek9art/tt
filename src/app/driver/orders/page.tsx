"use client";
import Link from "next/link";
import { ChevronLeft, ClipboardList } from "lucide-react";

// هذه الصفحة تُحوّل لصفحة المندوب الرئيسية
// الشحنات موجودة في /driver

export default function DriverOrdersPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)] p-4" dir="rtl">
      <div className="text-center">
        <ClipboardList size={48} className="mx-auto mb-4 text-brand-700 opacity-60"/>
        <h1 className="text-xl font-bold text-[var(--text-1)] mb-2">قائمة الشحنات</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          اذهب للوحة المندوب لعرض شحناتك
        </p>
        <Link href="/driver" className="btn-primary gap-2">
          <ChevronLeft size={16}/> لوحة المندوب
        </Link>
      </div>
    </div>
  );
}
