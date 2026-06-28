import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
export const metadata = { title: "السلة" };
export default function CartPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="container-main py-16 text-center">
        <p className="text-6xl mb-4">🛒</p>
        <h1 className="text-2xl font-bold text-[var(--text-1)] mb-2">السلة فارغة</h1>
        <p className="text-[var(--text-muted)] mb-6">لم تضف أي منتج بعد</p>
        <Link href="/products" className="btn-primary">تسوّق الآن</Link>
      </div>
      <Footer />
    </div>
  );
}
