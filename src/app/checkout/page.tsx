"use client";
import { useState, useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/api";
import { YEMEN_GOVERNORATES } from "@/lib/constants";
import { MapPin, Phone, User, ChevronDown, Banknote, Wallet, CreditCard, CheckCircle, Loader2 } from "lucide-react";

type Step = "info" | "payment" | "confirm";

const PAYMENT_METHODS = [
  { id: "cod",    label: "الدفع عند الاستلام", icon: Banknote,   desc: "ادفع نقداً عند الاستلام" },
  { id: "jawali", label: "محفظة جوالي",         icon: Wallet,     desc: "ادفع عبر محفظة جوالي" },
  { id: "jeeb",   label: "محفظة جيب",           icon: Wallet,     desc: "ادفع عبر محفظة جيب" },
  { id: "stripe", label: "بطاقة ائتمانية",       icon: CreditCard, desc: "Visa / Mastercard" },
];

export default function CheckoutPage() {
  const router              = useRouter();
  const { items, totalPrice, clearCart } = useCartStore();
  const { user }            = useAuthStore();
  const total               = totalPrice();
  const currency            = items[0]?.currency ?? "YER";
  const shipping            = total >= 50000 ? 0 : 2000;
  const grandTotal          = total + shipping;

  const [step,    setStep]    = useState<Step>("info");
  const [payment, setPayment] = useState("cod");
  const [loading, setLoading] = useState(false);
  const [orderNum,setOrderNum]= useState("");
  const [error,   setError]   = useState("");

  const [form, setForm] = useState({
    full_name: "", phone: "", governorate: "", district: "",
    street: "", landmark: "", notes: "",
  });
  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // إذا السلة فارغة
  if (items.length === 0 && !orderNum) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container-main py-20 text-center">
          <p className="text-5xl mb-4">🛒</p>
          <h2 className="text-xl font-bold text-[var(--text-1)] mb-4">السلة فارغة</h2>
          <Link href="/products" className="btn-primary">تسوّق الآن</Link>
        </div>
        <Footer />
      </div>
    );
  }

  // شاشة نجاح الطلب
  if (orderNum) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container-main py-20 text-center max-w-lg mx-auto">
          <CheckCircle size={72} className="mx-auto mb-6 text-green-500" />
          <h1 className="text-3xl font-bold text-[var(--text-1)] mb-3">تم إرسال طلبك!</h1>
          <p className="text-[var(--text-muted)] mb-2">رقم الطلب:</p>
          <p className="text-2xl font-bold text-brand-700 dark:text-accent-400 mb-4">{orderNum}</p>
          <p className="text-sm text-[var(--text-2)] mb-8 leading-relaxed">
            سيتواصل معك فريقنا على <strong>{form.phone}</strong> لتأكيد الطلب وتحديد موعد التوصيل.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/account/orders" className="btn-primary">تتبع الطلب</Link>
            <Link href="/" className="btn-ghost border border-[var(--border)]">العودة للرئيسية</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    if (!user) { router.push("/login?redirectTo=/checkout"); return; }
    setLoading(true); setError("");

    const orderItems = items.map(item => ({
      product_id:     item.product_id,
      variant_id:     item.variant_id,
      name_snapshot:  item.name_ar,
      sku_snapshot:   item.sku,
      attrs_snapshot: item.attributes,
      price:          item.price,
      quantity:       item.quantity,
      subtotal:       item.price * item.quantity,
    }));

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: orderItems,
          address: {
            full_name:   form.full_name,
            phone:       form.phone,
            governorate: form.governorate,
            district:    form.district,
            street:      form.street,
            landmark:    form.landmark,
          },
          payment_method: payment,
          notes:          form.notes,
          coupon_code:    "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "حدث خطأ، حاول مجدداً");
      } else {
        clearCart();
        setOrderNum(data.order_number);
      }
    } catch {
      setError("تعذّر الاتصال بالخادم، تحقق من اتصالك");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container-main py-8">
        <h1 className="mb-6 text-2xl font-bold text-[var(--text-1)]">إتمام الطلب</h1>

        {/* تنبيه تسجيل الدخول */}
        {!user && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-4 text-sm">
            <span className="text-2xl">🔐</span>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">يجب تسجيل الدخول لإتمام الطلب</p>
              <Link href="/login?redirectTo=/checkout" className="text-brand-700 dark:text-accent-400 font-semibold hover:underline">
                سجّل دخول الآن ←
              </Link>
            </div>
          </div>
        )}

        {/* مراحل */}
        <div className="mb-6 flex items-center gap-2 text-xs overflow-x-auto pb-1">
          {(["info","payment","confirm"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2 shrink-0">
              {i > 0 && <div className="h-px w-6 bg-[var(--border)]" />}
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors ${step === s ? "bg-brand-700 text-white" : "bg-[var(--border)] text-[var(--text-2)]"}`}>
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">{i+1}</span>
                {s === "info" ? "الشحن" : s === "payment" ? "الدفع" : "التأكيد"}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* النموذج */}
          <div className="lg:col-span-2">

            {/* مرحلة 1 */}
            {step === "info" && (
              <div className="card-base p-6 space-y-4">
                <h2 className="font-bold text-[var(--text-1)] flex items-center gap-2">
                  <MapPin size={18} className="text-brand-700" /> بيانات التوصيل
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">الاسم الكامل *</label>
                    <div className="relative">
                      <User size={13} className="absolute top-3 end-3 text-[var(--text-muted)]" />
                      <input type="text" placeholder="محمد أحمد" value={form.full_name}
                        onChange={e => setF("full_name", e.target.value)}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] pe-8 px-3 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-[var(--text-1)]" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">رقم الهاتف *</label>
                    <div className="relative">
                      <Phone size={13} className="absolute top-3 end-3 text-[var(--text-muted)]" />
                      <input type="tel" placeholder="7XXXXXXXX" value={form.phone} dir="ltr"
                        onChange={e => setF("phone", e.target.value)}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] pe-8 px-3 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-[var(--text-1)]" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">المحافظة *</label>
                    <div className="relative">
                      <ChevronDown size={13} className="absolute top-3 start-3 text-[var(--text-muted)] pointer-events-none" />
                      <select value={form.governorate} onChange={e => setF("governorate", e.target.value)}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] ps-8 px-3 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors appearance-none text-[var(--text-1)]">
                        <option value="">اختر المحافظة</option>
                        {YEMEN_GOVERNORATES.map(g => (
                          <option key={g.code} value={g.code}>{g.name_ar}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">المنطقة</label>
                    <input type="text" placeholder="الحي / المنطقة" value={form.district}
                      onChange={e => setF("district", e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-[var(--text-1)]" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">العنوان التفصيلي</label>
                    <input type="text" placeholder="الشارع، المبنى..." value={form.street}
                      onChange={e => setF("street", e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-[var(--text-1)]" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">علامة مميزة</label>
                    <input type="text" placeholder="بجانب مسجد / محل..." value={form.landmark}
                      onChange={e => setF("landmark", e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-[var(--text-1)]" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-[var(--text-2)]">ملاحظات</label>
                    <textarea rows={2} placeholder="أي تعليمات خاصة..." value={form.notes}
                      onChange={e => setF("notes", e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors resize-none text-[var(--text-1)]" />
                  </div>
                </div>
                <button onClick={() => setStep("payment")}
                  disabled={!form.full_name || !form.phone || !form.governorate}
                  className="btn-primary w-full justify-center">
                  التالي — طريقة الدفع
                </button>
              </div>
            )}

            {/* مرحلة 2 */}
            {step === "payment" && (
              <div className="card-base p-6">
                <h2 className="font-bold text-[var(--text-1)] mb-4">طريقة الدفع</h2>
                <div className="space-y-3">
                  {PAYMENT_METHODS.map(m => {
                    const Icon = m.icon;
                    const active = payment === m.id;
                    return (
                      <label key={m.id}
                        className={`flex items-center gap-4 cursor-pointer rounded-xl border-2 p-4 transition-all ${active ? "border-brand-700 bg-brand-50 dark:bg-brand-900/30" : "border-[var(--border)] hover:border-brand-300"}`}>
                        <input type="radio" name="payment" value={m.id}
                          checked={active} onChange={() => setPayment(m.id)} className="sr-only" />
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${active ? "bg-brand-700 text-white" : "bg-[var(--border)] text-[var(--text-2)]"}`}>
                          <Icon size={18} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-[var(--text-1)]">{m.label}</p>
                          <p className="text-xs text-[var(--text-muted)]">{m.desc}</p>
                        </div>
                        {active && <CheckCircle size={18} className="text-brand-700 shrink-0" />}
                      </label>
                    );
                  })}
                </div>
                <div className="mt-4 flex gap-3">
                  <button onClick={() => setStep("info")} className="btn-ghost border border-[var(--border)] flex-1">رجوع</button>
                  <button onClick={() => setStep("confirm")} className="btn-primary flex-1 justify-center">التالي — مراجعة</button>
                </div>
              </div>
            )}

            {/* مرحلة 3 */}
            {step === "confirm" && (
              <div className="space-y-4">
                <div className="card-base p-5">
                  <h2 className="font-bold text-[var(--text-1)] mb-3">منتجات الطلب</h2>
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
                  <h3 className="font-semibold text-[var(--text-1)] mb-2">عنوان التوصيل</h3>
                  <p className="text-sm text-[var(--text-2)]">{form.full_name} · {form.phone}</p>
                  <p className="text-sm text-[var(--text-2)]">
                    {YEMEN_GOVERNORATES.find(g => g.code === form.governorate)?.name_ar}
                    {form.district && ` · ${form.district}`}
                  </p>
                </div>
                <div className="card-base p-5">
                  <h3 className="font-semibold text-[var(--text-1)] mb-2">طريقة الدفع</h3>
                  <p className="text-sm text-[var(--text-2)]">{PAYMENT_METHODS.find(m => m.id === payment)?.label}</p>
                </div>
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
                    ⚠ {error}
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setStep("payment")} className="btn-ghost border border-[var(--border)] flex-1">رجوع</button>
                  <button onClick={handlePlaceOrder} disabled={loading}
                    className="btn-primary flex-1 justify-center">
                    {loading
                      ? <><Loader2 size={16} className="animate-spin" /> جارٍ الإرسال...</>
                      : "تأكيد الطلب"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ملخص جانبي */}
          <div>
            <div className="card-base p-5 sticky top-24">
              <h2 className="mb-4 font-bold text-[var(--text-1)] border-b border-[var(--border)] pb-3">ملخص الطلب</h2>
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
              <div className="mt-4 space-y-1 text-xs text-[var(--text-muted)]">
                <p>✓ منتجات أصلية بضمان</p>
                <p>✓ توصيل لكل محافظات اليمن</p>
                <p>✓ إرجاع خلال 7 أيام</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
