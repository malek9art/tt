import Link from "next/link";
import Header from "@/components/layout/Header";
export default function NotFound() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="container-main py-24 text-center">
        <p className="text-7xl mb-4">🔍</p>
        <h1 className="text-3xl font-bold text-[var(--text-1)] mb-2">404 — الصفحة غير موجودة</h1>
        <p className="text-[var(--text-muted)] mb-8">الصفحة التي تبحث عنها غير متاحة</p>
        <Link href="/" className="btn-primary">العودة للرئيسية</Link>
      </div>
    </div>
  );
}
