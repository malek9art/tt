import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
export const metadata = { title: "إنشاء حساب" };
export default function RegisterPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="container-main py-16 flex justify-center">
        <div className="card-base w-full max-w-md p-8">
          <h1 className="text-2xl font-bold text-[var(--text-1)] mb-6 text-center">إنشاء حساب جديد</h1>
          <p className="text-center text-[var(--text-muted)]">قريباً — نظام التسجيل قيد الإعداد</p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
