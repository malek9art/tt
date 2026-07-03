"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Package, Search } from "lucide-react";

// يقبل رمز التتبع مباشرة أو رابط تتبع كاملاً منسوخاً
function extractToken(input: string): string | null {
  const uuid = input.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return uuid ? uuid[0].toLowerCase() : null;
}

export default function TrackLandingPage() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = extractToken(value.trim());
    if (!token) {
      setError("أدخل رمز تتبع صحيحاً — تجده في رسالة تأكيد الطلب أو صفحة تفاصيل الطلب");
      return;
    }
    router.push(`/track/${token}`);
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container-main py-16 max-w-lg">
        <div className="text-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-900/30 mx-auto mb-4">
            <Package size={32} className="text-brand-700 dark:text-accent-400" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-1)]">تتبع طلبك</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
            الصق رمز التتبع أو رابط التتبع الذي وصلك عند تأكيد الطلب
          </p>
        </div>

        <form onSubmit={submit} className="card-base p-5 space-y-4">
          <input
            type="text" value={value} dir="ltr"
            onChange={e => { setValue(e.target.value); setError(""); }}
            placeholder="مثال: 3f2b1a...  أو رابط التتبع كاملاً"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors text-left"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full justify-center gap-2">
            <Search size={16} /> تتبع الطلب
          </button>
        </form>

        <p className="text-center text-sm text-[var(--text-muted)] mt-6">
          لديك حساب؟{" "}
          <Link href="/account/orders" className="text-brand-700 dark:text-accent-400 font-medium hover:underline">
            تابع كل طلباتك من هنا
          </Link>
        </p>
      </div>
      <Footer />
    </div>
  );
}
