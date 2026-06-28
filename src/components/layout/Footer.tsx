import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-[var(--border)] bg-brand-900 text-brand-100">
      <div className="container-main py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-500 text-brand-900 font-bold text-lg">أ</div>
              <div>
                <div className="text-sm font-bold text-white">مركز الأحمدي</div>
                <div className="text-xs text-brand-300">للجوالات ومستلزماتها</div>
              </div>
            </div>
            <p className="text-sm text-brand-300 leading-relaxed">
              وجهتك الأولى للجوالات والإكسسوارات في اليمن. أفضل الأسعار وأعلى جودة.
            </p>
          </div>
          <div>
            <h3 className="mb-4 font-semibold text-white">تسوّق</h3>
            <ul className="space-y-2 text-sm">
              {[["الهواتف الذكية","/products?cat=smartphones"],["الإكسسوارات","/products?cat=accessories"],["قطع الغيار","/products?cat=spare-parts"],["الصيانة","/products?cat=repair-services"]].map(([l,h])=>(
                <li key={h}><Link href={h} className="text-brand-300 hover:text-accent-500 transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-4 font-semibold text-white">حسابي</h3>
            <ul className="space-y-2 text-sm">
              {[["تسجيل الدخول","/login"],["إنشاء حساب","/register"],["طلباتي","/account/orders"],["العناوين","/account/addresses"]].map(([l,h])=>(
                <li key={h}><Link href={h} className="text-brand-300 hover:text-accent-500 transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-4 font-semibold text-white">تواصل معنا</h3>
            <ul className="space-y-2 text-sm text-brand-300">
              <li>📍 تعز، اليمن</li>
              <li>📞 00967-XXXXXXXXX</li>
              <li>💬 واتساب: 00967-XXXXXXXXX</li>
              <li>✉️ info@ahmadi.ye</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-brand-800 pt-6 text-center text-sm text-brand-400">
          © {new Date().getFullYear()} مركز الأحمدي للجوالات ومستلزماتها — جميع الحقوق محفوظة
        </div>
      </div>
    </footer>
  );
}
