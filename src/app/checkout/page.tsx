"use client";
import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/api";
import { MapPin, Phone, User, ChevronDown, Banknote, CreditCard, Wallet, CheckCircle, Loader2 } from "lucide-react";
import { YEMEN_GOVERNORATES } from "@/lib/constants";

type Step = "info" | "payment" | "confirm";

const PAYMENT_METHODS = [
  { id: "cod",    label: "الدفع عند الاستلام", icon: Banknote,    desc: "ادفع نقداً عند وصول طلبك" },
  { id: "jawali", label: "محفظة جوالي",         icon: Wallet,      desc: "ادفع عبر محفظة جوالي" },
  { id: "jeeb",   label: "محفظة جيب",           icon: Wallet,      desc: "ادفع عبر محفظة جيب" },
  { id: "stripe", label: "بطاقة ائتمانية",       icon: CreditCard,  desc: "Visa / Mastercard" },
];

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCartStore();
  const total     = totalPrice();
  const currency  = items[0]?.currency ?? "YER";
  const shipping  = total >= 50000 ? 0 : 2000;
  const grandTotal = total + shipping;

  const [step, setStep]             = useState<Step>("info");
  const [paymentMethod, setPayment] = useState("cod");
  const [loading, setLoading]       = useState(false);
  const [orderDone, setOrderDone]   = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  const [form, setForm] = useState({
    full_name: "", phone: "", governorate: "", district: "",
    street: "", landmark: "", notes: "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handlePlaceOrder = async () => {
    setLoading(true);
    // محاكاة الإرسال (سيُستبدل بـ API حقيقي لاحقاً)
    await new Promise(r => setTimeout(r, 1500));
    const num = `ORD-${Date.now().toString().slice(-6)}`;
    setOrderNumber(num);
    setOrderDone(true);
    clearCart();
    setLoading(false);
  };

  if (items.length === 0 && !orderDone) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container-main py-20 text-center">
          <p className="text-5xl mb-4">🛒</p>
          <h2 className="text-xl font-bold mb-4 text-[var(--text-1)]">السلة فارغة</h2>
          <Link href="/products" className="btn-primary">تسوّق الآن</Link>
        </div>
        <Footer />
      </div>
    );
  }

  // شاشة تأكيد الطلب
  if (orderDone) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container-main py-20 text-center max-w-lg mx-auto">
          <div className="flex justify-center mb-6">
            <CheckCircle size={72} className="text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-1)] mb-3">تم إرسال طلبك!</h1>
          <p className="text-[var(--text-muted)] mb-2">رقم الطلب:</p>
          <p className="text-2xl font-bold text-brand-700 dark:text-accent-400 mb-6">{orderNumber}</p>
          <p className="text-sm text-[var(--text-2)] mb-8">
            سيتواصل معك فريقنا قريباً لتأكيد الطلب وتحديد موعد التوصيل.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/" className="btn-primary">العودة للرئيسية</Link>
            <Link href="/products" className="btn-ghost border border-[var(--border)]">متابعة التسوق</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container-main py-8">
        <h1 className="mb-6 text-2xl font-bold text-[var(--text-1)]">إتمام الطلب</h1>

        {/* مراحل */}
        <div className="mb-8 flex items-center gap-2 text-sm">
          {(["info","payment","confirm"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="h-px w-8 bg-[var(--border)]" />}
              <button onClick={() => step !== "info" || s === "info" ? setStep(s) : null}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${step === s ? "bg-brand-700 text-white" : "bg-[var(--border)] text-[var(--text-2)]"}`}>
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">{i+1}</span>
                {s === "info" ? "بيانات الشحن" : s === "payment" ? "طريقة الدفع" : "تأكيد الطلب"}
              </button>
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* النموذج */}
          <div className="lg:col-span-2">
            {/* المرحلة 1: بيانات الشحن */}
            {step === "info" && (
              <div className="card-base p-6 space-y-4">
                <h2 className="font-bold text-[var(--text-1)] flex items-center gap-2 mb-2">
                  <MapPin size={18} className="text-brand-700" /> بيانات الشحن
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--text-2)]">الاسم الكامل *</label>
                    <div className="relative">
                      <User size={15} className="absolute top-3 end-3 text-[var(--text-muted)]" />
                      <input type="text" placeholder="محمد أحمد العلوي" value={form.full_name}
                        onChange={e => set("full_name", e.target.value)}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] pe-9 px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--text-2)]">رقم الهاتف *</label>
                    <div className="relative">
                      <Phone size={15} className="absolute top-3 end-3 text-[var(--text-muted)]" />
                      <input type="tel" placeholder="7XXXXXXXX" value={form.phone}
                        onChange={e => set("phone", e.target.value)} dir="ltr"
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] pe-9 px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--text-2)]">المحافظة *</label>
                    <div className="relative">
                      <ChevronDown size={15} className="absolute top-3 start-3 text-[var(--text-muted)] pointer-events-none" />
                      <select value={form.governorate} onChange={e => set("governorate", e.target.value)}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] ps-8 px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors appearance-none">
                        <option value="">اختر المحافظة</option>
                        {YEMEN_GOVERNORATES.map(g => (
                          <option key={g.code} value={g.code}>{g.name_ar}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--text-2)]">المنطقة / الحي</label>
                    <input type="text" placeholder="حي الأحمدي" value={form.district}
                      onChange={e => set("district", e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-[var(--text-2)]">الشارع / العنوان التفصيلي</label>
                    <input type="text" placeholder="شارع..." value={form.street}
                      onChange={e => set("street", e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-[var(--text-2)]">علامة مميزة</label>
                    <input type="text" placeholder="قريب من مسجد / محل..." value={form.landmark}
                      onChange={e => set("landmark", e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-[var(--text-2)]">ملاحظات للمندوب</label>
                    <textarea rows={2} placeholder="أي تعليمات خاصة..." value={form.notes}
                      onChange={e => set("notes", e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors resize-none" />
                  </div>
                </div>
                <button
                  onClick={() => setStep("payment")}
                  disabled={!form.full_name || !form.phone || !form.governorate}
                  className="btn-primary w-full justify-center mt-2">
                  التالي — طريقة الدفع
                </button>
              </div>
            )}

            {/* المرحلة 2: طريقة الدفع */}
            {step === "payment" && (
              <div className="card-base p-6">
                <h2 className="font-bold text-[var(--text-1)] mb-4">طريقة الدفع</h2>
                <div className="space-y-3">
                  {PAYMENT_METHODS.map(m => {
                    const Icon = m.icon;
                    return (
                      <label key={m.id}
                        className={`flex items-center gap-4 cursor-pointer rounded-xl border-2 p-4 transition-all ${paymentMethod === m.id ? "border-brand-700 bg-brand-50 dark:bg-brand-900/30" : "border-[var(--border)] hover:border-brand-300"}`}>
                        <input type="radio" name="payment" value={m.id}
                          checked={paymentMethod === m.id}
                          onChange={() => setPayment(m.id)} className="sr-only" />
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${paymentMethod === m.id ? "bg-brand-700 text-white" : "bg-[var(--border)] text-[var(--text-2)]"}`}>
                          <Icon size={18} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-[var(--text-1)] text-sm">{m.label}</p>
                          <p className="text-xs text-[var(--text-muted)]">{m.desc}</p>
                        </div>
                        {paymentMethod === m.id && <CheckCircle size={18} className="text-brand-700 shrink-0" />}
                      </label>
                    );
                  })}
                </div>
                <div className="mt-4 flex gap-3">
                  <button onClick={() => setStep("info")} className="btn-ghost border border-[var(--border)] flex-1">
                    رجوع
                  </button>
                  <button onClick={() => setStep("confirm")} className="btn-primary flex-1 justify-center">
                    التالي — مراجعة الطلب
                  </button>
                </div>
              </div>
            )}

            {/* المرحلة 3: تأكيد */}
            {step === "confirm" && (
              <div className="space-y-4">
                <div className="card-base p-5">
                  <h2 className="font-bold text-[var(--text-1)] mb-3">مراجعة الطلب</h2>
                  <div className="space-y-3">
                    {items.map(item => (
                      <div key={item.id} className="flex gap-3 items-center">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--border)]">
                          <Image src={item.image} alt={item.name_ar} fill sizes="48px" className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-1)] line-clamp-1">{item.name_ar}</p>
                          <p className="text-xs text-[var(--text-muted)]">الكمية: {item.quantity}</p>
                        </div>
                        <span className="text-sm font-bold text-brand-700 dark:text-accent-400 shrink-0">
                          {formatPrice(item.price * item.quantity, item.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card-base p-5">
                  <h3 className="font-semibold text-[var(--text-1)] mb-3">عنوان التوصيل</h3>
                  <p className="text-sm text-[var(--text-2)]">{form.full_name} — {form.phone}</p>
                  <p className="text-sm text-[var(--text-2)]">
                    {YEMEN_GOVERNORATES.find(g => g.code === form.governorate)?.name_ar}
                    {form.district && ` — ${form.district}`}
                    {form.street && ` — ${form.street}`}
                  </p>
                </div>

                <div className="card-base p-5">
                  <h3 className="font-semibold text-[var(--text-1)] mb-3">طريقة الدفع</h3>
                  <p className="text-sm text-[var(--text-2)]">
                    {PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep("payment")} className="btn-ghost border border-[var(--border)] flex-1">
                    رجوع
                  </button>
                  <button onClick={handlePlaceOrder} disabled={loading}
                    className="btn-primary flex-1 justify-center">
                    {loading ? <><Loader2 size={16} className="animate-spin" /> جارٍ الإرسال...</> : "تأكيد الطلب"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ملخص جانبي */}
          <div className="lg:col-span-1">
            <div className="card-base p-5 sticky top-24">
              <h2 className="mb-4 font-bold text-[var(--text-1)] border-b border-[var(--border)] pb-3">
                ملخص الطلب
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-[var(--text-2)]">
                  <span>المنتجات ({items.length})</span>
                  <span>{formatPrice(total, currency)}</span>
                </div>
                <div className="flex justify-between text-[var(--text-2)]">
                  <span>الشحن</span>
                  <span className={shipping === 0 ? "text-green-600 font-medium" : ""}>
                    {shipping === 0 ? "مجاني" : formatPrice(shipping, currency)}
                  </span>
                </div>
                <div className="border-t border-[var(--border)] pt-2 flex justify-between font-bold text-[var(--text-1)]">
                  <span>الإجمالي</span>
                  <span className="text-brand-700 dark:text-accent-400">{formatPrice(grandTotal, currency)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
