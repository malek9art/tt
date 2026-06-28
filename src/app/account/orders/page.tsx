import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { Package, ChevronLeft } from "lucide-react";

export const metadata = { title: "طلباتي" };

export default function OrdersPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="container-main py-8">
        <nav className="mb-6 text-sm text-[var(--text-muted)]">
          <Link href="/account" className="hover:text-brand-700">حسابي</Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--text-1)]">طلباتي</span>
        </nav>
        <h1 className="mb-6 text-2xl font-bold text-[var(--text-1)]">طلباتي</h1>
        <div className="py-16 text-center rounded-xl border border-dashed border-[var(--border)]">
          <Package size={48} className="mx-auto mb-4 text-[var(--border)]" />
          <p className="font-semibold text-[var(--text-1)] mb-2">لا توجد طلبات بعد</p>
          <p className="text-sm text-[var(--text-muted)] mb-6">ابدأ التسوق لتظهر طلباتك هنا</p>
          <Link href="/products" className="btn-primary">تسوّق الآن</Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
