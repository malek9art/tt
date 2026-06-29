import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="container-main py-24 text-center">
        <p className="text-7xl mb-6">🔍</p>
        <h1 className="text-4xl font-bold text-[var(--text-1)] mb-3">
          404
        </h1>
        <p className="text-xl text-[var(--text-2)] mb-2">الصفحة غير موجودة</p>
        <p className="text-[var(--text-muted)] mb-10 max-w-sm mx-auto">
          الصفحة التي تبحث عنها غير متاحة أو تم نقلها
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn-primary">
            العودة للرئيسية
          </Link>
          <Link href="/products" className="btn-ghost border border-[var(--border)]">
            تصفح المنتجات
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
