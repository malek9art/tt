"use client";
import { useState, useEffect, useCallback } from "react";
import { useCartStore }  from "@/store/cartStore";
import { useAuthStore }  from "@/store/authStore";
import Header  from "@/components/layout/Header";
import Footer  from "@/components/layout/Footer";
import Image   from "next/image";
import Link    from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { formatPrice } from "@/lib/api";
import {
  HiMapPin, HiPhone, HiUser, HiChevronDown, HiCheckCircle,
  HiArrowLeft, HiBookmark, HiTag, HiXMark, HiClipboard,
  HiCheck, HiExclamationCircle, HiClock, HiShieldCheck,
} from "react-icons/hi2";
import type { PaymentInstruction } from "@/lib/payment/types";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const GOVS = [
  "أمانة العاصمة","صنعاء","عدن","تعز","الحديدة","إب",
  "ذمار","حضرموت","شبوة","مأرب","الجوف","البيضاء",
  "ريمة","المحويت","حجة","صعدة","عمران","لحج",
  "أبين","الضالع","المهرة","سقطرى",
];

type Step = "info" | "payment" | "processing" | "confirm";

interface SavedAddress {
  id: string; label: string|null; full_name: string; phone: string;
  governorate: string; district: string|null; street: string|null;
  landmark: string|null; is_default: boolean;
}

interface Coupon {
  id: string; code: string; type: string; value: number; min_order_amount: number|null;
}

interface Provider {
  code: string; name: string; metadata: {
    icon: string; name_ar: string; description: string;
    type: string; confirmation: string; logo_url?: string;
  };
}

// Checkout payment sections — grouped by provider type
const PAYMENT_SECTIONS: Array<{ key: string; title: string; emoji: string; types: string[] }> = [
  { key:"cod",     title:"الدفع عند الاستلام",   emoji:"💵", types:["cod"] },
  { key:"wallets", title:"المحافظ الإلكترونية",  emoji:"📱", types:["manual_wallet"] },
  { key:"points",  title:"شبكات ونقاط التحويل",  emoji:"🏦", types:["transfer_point"] },
  { key:"banks",   title:"التحويل البنكي",        emoji:"🏛️", types:["bank_transfer"] },
  { key:"cards",   title:"البطاقات الدولية",      emoji:"💳", types:["stripe"] },
];

interface TransferPoint { id: string; label: string; phone: string; accountName?: string; notes?: string; }

const iCls = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

const PROVIDER_EMOJIS: Record<string, string> = {
  cod:"💵", stripe:"💳", jawali:"📱", jeeb:"📱",
  floosak:"💳", kuraimi:"🏦", qutaibi:"🏦",
  onecash:"💰", yemenmobile:"📱", bank:"🏦",
};

// ── Copy-to-clipboard helper ─────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy}
      className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-all ${
        copied
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-accent-400"
      }`}>
      {copied ? <><HiCheck className="text-sm"/> تم النسخ</> : <><HiClipboard className="text-sm"/> نسخ</>}
    </button>
  );
}

// ── Payment Instructions Renderer ────────────────────
function PaymentInstructions({
  instruction, orderNumber, amount,
}: { instruction: PaymentInstruction; orderNumber: string; amount: number }) {
  const extra = instruction.extra as Record<string, unknown> | undefined;
  const points = (extra?.points ?? []) as TransferPoint[];
  const networkName = extra?.networkName as string | undefined;

  return (
    <div className="space-y-4">
      {/* خطوات الدفع */}
      {instruction.steps && (
        <ol className="space-y-2">
          {instruction.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white text-xs font-bold">
                {i + 1}
              </span>
              <span className="text-sm text-[var(--text-2)] leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      )}

      {/* تفاصيل الحساب (محافظ/بنوك) */}
      {instruction.accountNumber && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-page)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">رقم الحساب / المحفظة</span>
            <CopyButton text={instruction.accountNumber} />
          </div>
          <p className="text-xl font-bold text-brand-700 dark:text-accent-400 tracking-wider" dir="ltr">
            {instruction.accountNumber}
          </p>
          {instruction.accountName && (
            <p className="text-sm text-[var(--text-2)]">الاسم: {instruction.accountName}</p>
          )}
        </div>
      )}

      {/* رقم المرجع */}
      <div className="flex items-center justify-between rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-page)] px-4 py-3">
        <div>
          <p className="text-xs text-[var(--text-muted)]">رقم الطلب المرجعي</p>
          <p className="font-bold text-[var(--text-1)]" dir="ltr">{orderNumber}</p>
        </div>
        <CopyButton text={orderNumber} />
      </div>

      {/* المبلغ */}
      <div className="flex items-center justify-between rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">المبلغ المطلوب</p>
        <p className="text-lg font-bold text-amber-900 dark:text-amber-200">
          {amount.toLocaleString("ar")} ﷼
        </p>
      </div>

      {/* نقاط التحويل */}
      {points.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[var(--text-1)]">
            نقاط {networkName ?? "التحويل"} المتاحة:
          </p>
          {points.map(pt => (
            <div key={pt.id}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-1)] truncate">{pt.label}</p>
                {pt.accountName && (
                  <p className="text-xs text-[var(--text-muted)]">{pt.accountName}</p>
                )}
                {pt.notes && (
                  <p className="text-xs text-[var(--text-muted)]">{pt.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <p className="font-bold text-brand-700 dark:text-accent-400 text-sm" dir="ltr">{pt.phone}</p>
                <CopyButton text={pt.phone} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────
export default function CheckoutPage() {
  const router  = useRouter();
  const { items, totalPrice, clearCart } = useCartStore();
  const { user } = useAuthStore();

  const [step,           setStep]          = useState<Step>("info");
  const [providerCode,   setProviderCode]  = useState("cod");
  const [providers,      setProviders]     = useState<Provider[]>([]);
  const [loading,        setLoading]       = useState(false);
  const [orderNum,       setOrderNum]      = useState("");
  const [orderId,        setOrderId]       = useState("");
  const [totalFinal,     setTotalFinal]    = useState(0);
  const [instruction,    setInstruction]   = useState<PaymentInstruction | null>(null);
  const [error,          setError]         = useState("");
  const [savedAddresses, setSavedAddresses]= useState<SavedAddress[]>([]);
  const [selectedAddr,   setSelectedAddr]  = useState<string|null>(null);
  const [showAddrList,   setShowAddrList]  = useState(false);
  const [couponCode,     setCouponCode]    = useState("");
  const [coupon,         setCoupon]        = useState<Coupon|null>(null);
  const [couponLoading,  setCouponLoading] = useState(false);
  const [couponError,    setCouponError]   = useState("");

  const [form, setForm] = useState({
    full_name:"", phone:"", governorate:"تعز",
    district:"", street:"", landmark:"", notes:"",
  });
  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!user) router.replace("/login?redirectTo=/checkout");
  }, [user, router]);

  // Load active providers
  useEffect(() => {
    fetch("/api/payments/providers")
      .then(r => r.json())
      .then(d => {
        const list: Provider[] = (d.providers ?? []);
        setProviders(list);
        if (list.length > 0 && !list.find(p => p.code === providerCode)) {
          setProviderCode(list[0].code);
        }
      })
      .catch(() => {});
  }, []);

  const loadAddresses = useCallback(async () => {
    if (!user) return;
    const { data } = await sb
      .from("addresses")
      .select("id,label,full_name,phone,governorate,district,street,landmark,is_default")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false });
    const addrs = (data as SavedAddress[]) ?? [];
    setSavedAddresses(addrs);
    const def = addrs.find(a => a.is_default);
    if (def) applyAddress(def);
  }, [user]);

  useEffect(() => { loadAddresses(); }, [loadAddresses]);

  const applyAddress = (addr: SavedAddress) => {
    setForm({ full_name: addr.full_name, phone: addr.phone, governorate: addr.governorate,
      district: addr.district ?? "", street: addr.street ?? "",
      landmark: addr.landmark ?? "", notes: "" });
    setSelectedAddr(addr.id);
    setShowAddrList(false);
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true); setCouponError("");
    const { data, error: dbErr } = await sb
      .from("coupons")
      .select("id,code,type,value,min_order_amount,max_uses,uses_count,expires_at,is_active")
      .eq("code", couponCode.trim().toUpperCase())
      .eq("is_active", true)
      .maybeSingle();

    if (dbErr || !data) { setCouponError("كود غير صحيح أو منتهي الصلاحية"); setCouponLoading(false); return; }
    if (data.expires_at && new Date(data.expires_at) < new Date()) { setCouponError("انتهت صلاحية الكوبون"); setCouponLoading(false); return; }
    if (data.max_uses !== null && data.uses_count >= data.max_uses) { setCouponError("استُنفدت الاستخدامات"); setCouponLoading(false); return; }
    if (data.min_order_amount && subtotal < data.min_order_amount) {
      setCouponError(`الحد الأدنى ${data.min_order_amount.toLocaleString("ar")} ﷼`);
      setCouponLoading(false); return;
    }
    setCoupon(data as Coupon); setCouponLoading(false);
  };

  const removeCoupon = () => { setCoupon(null); setCouponCode(""); setCouponError(""); };

  const subtotal = totalPrice();
  const shipping = subtotal >= 50000 ? 0 : 2000;
  const discount = coupon
    ? coupon.type === "percentage"
      ? Math.round(subtotal * coupon.value / 100)
      : Math.min(coupon.value, subtotal)
    : 0;
  const total = subtotal + shipping - discount;

  // Step 1 → 2
  const goToPayment = () => {
    if (!form.full_name.trim()) { setError("أدخل الاسم الكامل"); return; }
    if (!form.phone.trim())     { setError("أدخل رقم الهاتف");    return; }
    setError(""); setStep("payment");
  };

  // Step 2 → Create order → initiate payment
  const handleSubmit = async () => {
    if (!items.length) { setError("السلة فارغة"); return; }
    setLoading(true); setError("");

    // 1) Create order
    const orderRes = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idempotency_key: `checkout-${user?.id}-${Date.now()}`,
        items: items.map(i => ({
          product_id: i.product_id, variant_id: i.variant_id,
          name_snapshot: i.name_ar, sku_snapshot: i.sku,
          attrs_snapshot: i.attributes, price: i.price,
          quantity: i.quantity, subtotal: i.price * i.quantity,
        })),
        address: { ...form },
        payment_method: providerCode,
        notes: form.notes,
        coupon_code: coupon?.code ?? "",
        discount_amount: discount,
      }),
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok || orderData.error) {
      setError(orderData.error ?? "فشل في إنشاء الطلب"); setLoading(false); return;
    }

    setOrderId(orderData.order_id);
    setOrderNum(orderData.order_number);
    setTotalFinal(orderData.total);

    // 2) Initiate payment via gateway
    const payRes = await fetch("/api/payments/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId:      orderData.order_id,
        orderNumber:  orderData.order_number,
        providerCode,
      }),
    });

    const payData = await payRes.json();
    if (!payRes.ok || !payData.success) {
      setError(payData.error ?? "فشل في بدء الدفع"); setLoading(false); return;
    }

    clearCart();
    setInstruction(payData.instruction);
    setStep(payData.instruction?.type === "redirect" ? "processing" : "confirm");
    setLoading(false);
  };

  if (!items.length && step !== "confirm" && step !== "processing") {
    return (
      <div className="min-h-screen">
        <Header/>
        <div className="container-main py-20 text-center">
          <p className="text-5xl mb-4">🛒</p>
          <h1 className="text-xl font-bold text-[var(--text-1)] mb-2">السلة فارغة</h1>
          <Link href="/products" className="btn-primary mt-4 inline-flex">تصفح المنتجات</Link>
        </div>
        <Footer/>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header/>
      <div className="container-main py-8">

        {/* Progress bar */}
        {step !== "confirm" && step !== "processing" && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {[
              { id: "info",    label: "بيانات التوصيل" },
              { id: "payment", label: "طريقة الدفع" },
            ].map(({ id, label }, idx) => {
              const done    = step === "payment" && id === "info";
              const current = step === id;
              return (
                <div key={id} className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    done    ? "bg-green-500 text-white"
                    : current ? "bg-brand-700 text-white"
                    :           "bg-[var(--border)] text-[var(--text-muted)]"
                  }`}>
                    {done ? <HiCheckCircle className="text-sm"/> : idx + 1}
                  </div>
                  <span className={`text-sm ${current ? "font-semibold text-[var(--text-1)]" : "text-[var(--text-muted)]"}`}>
                    {label}
                  </span>
                  {idx < 1 && <HiArrowLeft className="text-[var(--border)] text-sm rotate-180"/>}
                </div>
              );
            })}
          </div>
        )}

        {/* ===== Confirm Screen ===== */}
        {step === "confirm" && (
          <div className="max-w-lg mx-auto space-y-5 py-8">
            <div className="text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mx-auto mb-4">
                <HiCheckCircle className="text-5xl text-green-500"/>
              </div>
              <h1 className="text-2xl font-bold text-[var(--text-1)]">تم استلام طلبك! 🎉</h1>
              <p className="text-[var(--text-muted)] mt-1">رقم الطلب</p>
              <p className="text-3xl font-bold text-brand-700 dark:text-accent-400 mt-1" dir="ltr">
                #{orderNum}
              </p>
            </div>

            {/* Payment instructions */}
            {instruction && instruction.type !== "cod" && (
              <div className="card-base p-5 space-y-4">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <HiClock className="text-lg shrink-0"/>
                  <p className="text-sm font-semibold">أكمل عملية الدفع لتأكيد طلبك</p>
                </div>
                <PaymentInstructions
                  instruction={instruction}
                  orderNumber={orderNum}
                  amount={totalFinal}
                />
              </div>
            )}

            {instruction?.type === "cod" && (
              <div className="card-base p-5 flex items-start gap-3">
                <HiShieldCheck className="text-2xl text-green-500 shrink-0 mt-0.5"/>
                <div>
                  <p className="font-semibold text-[var(--text-1)]">الدفع عند الاستلام</p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    سيتواصل معك فريقنا لتأكيد الطلب وترتيب موعد التوصيل
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Link href="/account/orders" className="btn-primary flex-1 justify-center">
                متابعة طلباتي
              </Link>
              <Link href="/" className="btn-ghost border border-[var(--border)] flex-1 justify-center">
                الرئيسية
              </Link>
            </div>
          </div>
        )}

        {step !== "confirm" && step !== "processing" && (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-5">

              {/* ===== Step 1: Delivery Info ===== */}
              {step === "info" && (
                <>
                  {savedAddresses.length > 0 && (
                    <div className="card-base p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-[var(--text-1)] flex items-center gap-2">
                          <HiBookmark className="text-brand-700"/> عناوين محفوظة
                        </h2>
                        <button onClick={() => setShowAddrList(!showAddrList)}
                          className="text-sm text-brand-700 dark:text-accent-400 hover:underline flex items-center gap-1">
                          {showAddrList ? "إخفاء" : "اختيار"}
                          <HiChevronDown className={`transition-transform ${showAddrList ? "rotate-180" : ""}`}/>
                        </button>
                      </div>
                      {selectedAddr && !showAddrList && (
                        <div className="rounded-lg bg-brand-50 dark:bg-brand-900/30 px-3 py-2 text-sm text-[var(--text-2)]">
                          {savedAddresses.find(a => a.id === selectedAddr)?.full_name} —{" "}
                          {savedAddresses.find(a => a.id === selectedAddr)?.governorate}
                        </div>
                      )}
                      {showAddrList && (
                        <div className="space-y-2 mt-2">
                          {savedAddresses.map(addr => (
                            <button key={addr.id} onClick={() => applyAddress(addr)}
                              className={`w-full text-right rounded-xl border p-3.5 transition-all ${
                                selectedAddr === addr.id
                                  ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30"
                                  : "border-[var(--border)] hover:border-brand-300"
                              }`}>
                              <p className="font-medium text-sm text-[var(--text-1)]">{addr.full_name}</p>
                              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                {addr.governorate}{addr.district && ` · ${addr.district}`}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="card-base p-5 space-y-4">
                    <h2 className="font-semibold text-[var(--text-1)] flex items-center gap-2 border-b border-[var(--border)] pb-3">
                      <HiMapPin className="text-brand-700"/> عنوان التوصيل
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">الاسم الكامل *</label>
                        <div className="relative">
                          <HiUser className="absolute top-3.5 end-3 text-sm text-[var(--text-muted)]"/>
                          <input type="text" placeholder="محمد أحمد" value={form.full_name}
                            onChange={e => setF("full_name", e.target.value)} className={`${iCls} pe-9`}/>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">رقم الهاتف *</label>
                        <div className="relative">
                          <HiPhone className="absolute top-3.5 end-3 text-sm text-[var(--text-muted)]"/>
                          <input type="tel" dir="ltr" placeholder="7XXXXXXXX" value={form.phone}
                            onChange={e => setF("phone", e.target.value)} className={`${iCls} pe-9`}/>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">المحافظة *</label>
                        <div className="relative">
                          <select value={form.governorate} onChange={e => setF("governorate", e.target.value)}
                            className={`${iCls} appearance-none pe-9`}>
                            {GOVS.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                          <HiChevronDown className="absolute top-3.5 start-3 text-sm text-[var(--text-muted)] pointer-events-none"/>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">المديرية / الحي</label>
                        <input type="text" placeholder="اسم الحي" value={form.district}
                          onChange={e => setF("district", e.target.value)} className={iCls}/>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">الشارع / التفاصيل</label>
                        <input type="text" placeholder="اسم الشارع، رقم المبنى..." value={form.street}
                          onChange={e => setF("street", e.target.value)} className={iCls}/>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">علامة مميزة (اختياري)</label>
                        <input type="text" placeholder="بجانب مسجد..." value={form.landmark}
                          onChange={e => setF("landmark", e.target.value)} className={iCls}/>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">ملاحظات (اختياري)</label>
                        <textarea rows={2} value={form.notes}
                          onChange={e => setF("notes", e.target.value)} className={`${iCls} resize-none`}/>
                      </div>
                    </div>
                    {error && (
                      <p className="flex items-center gap-1.5 text-sm text-red-500">
                        <HiExclamationCircle className="text-base shrink-0"/> {error}
                      </p>
                    )}
                    <button onClick={goToPayment} className="btn-primary w-full justify-center py-3">
                      التالي — طريقة الدفع
                    </button>
                  </div>
                </>
              )}

              {/* ===== Step 2: Payment Method ===== */}
              {step === "payment" && (
                <div className="card-base p-5 space-y-5">
                  <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3">
                    اختر طريقة الدفع
                  </h2>

                  {providers.length === 0 ? (
                    <div className="space-y-3">
                      {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-[var(--border)] animate-pulse"/>)}
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {PAYMENT_SECTIONS.map(section => {
                        const list = providers.filter(p => section.types.includes(p.metadata?.type ?? ""));
                        if (list.length === 0) return null;
                        return (
                          <div key={section.key} className="rounded-2xl border border-[var(--border)] overflow-hidden">
                            <div className="flex items-center gap-2 bg-[var(--bg-page)] px-4 py-2.5 border-b border-[var(--border)]">
                              <span className="text-lg">{section.emoji}</span>
                              <h3 className="text-sm font-bold text-[var(--text-1)]">{section.title}</h3>
                              <span className="text-[10px] text-[var(--text-muted)] mr-auto">{list.length}</span>
                            </div>
                            <div className="p-3 space-y-2">
                              {list.map(p => {
                                const meta = p.metadata ?? {} as Provider["metadata"];
                                const isManual = meta.confirmation === "manual";
                                return (
                                  <label key={p.code}
                                    className={`flex items-center gap-3.5 rounded-xl border p-3.5 cursor-pointer transition-all ${
                                      providerCode === p.code
                                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30"
                                        : "border-[var(--border)] hover:border-brand-300"
                                    }`}>
                                    <input type="radio" name="provider" value={p.code}
                                      checked={providerCode === p.code}
                                      onChange={() => setProviderCode(p.code)}
                                      className="h-4 w-4 text-brand-700 shrink-0"/>
                                    {meta.logo_url ? (
                                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white border border-[var(--border)]">
                                        <Image src={meta.logo_url} alt={meta.name_ar ?? p.name} fill className="object-contain p-0.5" unoptimized/>
                                      </span>
                                    ) : (
                                      <span className="text-2xl shrink-0">{PROVIDER_EMOJIS[p.code] ?? "💰"}</span>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold text-sm text-[var(--text-1)]">{meta.name_ar ?? p.name}</p>
                                        {isManual && (
                                          <span className="text-[10px] rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5">
                                            يتطلب تأكيد يدوي
                                          </span>
                                        )}
                                        {meta.confirmation === "on_delivery" && (
                                          <span className="text-[10px] rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5">
                                            ادفع عند الاستلام
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{meta.description}</p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Coupon */}
                  <div className="border-t border-[var(--border)] pt-4">
                    <h3 className="text-sm font-semibold text-[var(--text-1)] mb-3 flex items-center gap-2">
                      <HiTag className="text-brand-700"/> كود خصم
                    </h3>
                    {coupon ? (
                      <div className="flex items-center justify-between rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3">
                        <div>
                          <p className="font-bold text-green-700 dark:text-green-400" dir="ltr">{coupon.code}</p>
                          <p className="text-xs text-green-600 dark:text-green-400">
                            وفّرت {discount.toLocaleString("ar")} ﷼
                          </p>
                        </div>
                        <button onClick={removeCoupon} className="text-red-400 hover:text-red-600">
                          <HiXMark className="text-lg"/>
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input type="text" dir="ltr" placeholder="PROMO20" value={couponCode}
                          onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                          onKeyDown={e => e.key === "Enter" && applyCoupon()}
                          className={`${iCls} flex-1 uppercase`}/>
                        <button onClick={applyCoupon} disabled={couponLoading || !couponCode}
                          className="btn-primary px-4 whitespace-nowrap">
                          {couponLoading ? <span className="animate-spin inline-block">⏳</span> : "تطبيق"}
                        </button>
                      </div>
                    )}
                    {couponError && <p className="mt-1 text-xs text-red-500">⚠ {couponError}</p>}
                  </div>

                  {error && (
                    <p className="flex items-center gap-1.5 text-sm text-red-500">
                      <HiExclamationCircle className="text-base shrink-0"/> {error}
                    </p>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => { setStep("info"); setError(""); }}
                      className="btn-ghost border border-[var(--border)] flex-1 justify-center">
                      ← السابق
                    </button>
                    <button onClick={handleSubmit} disabled={loading}
                      className="btn-primary flex-1 justify-center py-3">
                      {loading
                        ? <span className="flex items-center gap-2"><span className="animate-spin">⏳</span> جارٍ المعالجة...</span>
                        : "تأكيد الطلب →"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div>
              <div className="card-base p-5 sticky top-20 space-y-4">
                <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3">ملخص الطلب</h2>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {items.map(item => (
                    <div key={`${item.product_id}-${item.variant_id ?? ""}`} className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-brand-50">
                        {item.image
                          ? <Image src={item.image} alt={item.name_ar} fill sizes="48px" className="object-cover"/>
                          : <div className="flex h-full items-center justify-center">📱</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-1)] line-clamp-1">{item.name_ar}</p>
                        {Object.values(item.attributes).length > 0 && (
                          <p className="text-xs text-[var(--text-muted)]">{Object.values(item.attributes).join(" / ")}</p>
                        )}
                        <p className="text-xs text-[var(--text-muted)]">× {item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-[var(--text-1)] whitespace-nowrap">
                        {formatPrice(item.price * item.quantity, item.currency)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[var(--border)] pt-3 space-y-2">
                  <div className="flex justify-between text-sm text-[var(--text-2)]">
                    <span>المجموع الفرعي</span><span>{subtotal.toLocaleString("ar")} ﷼</span>
                  </div>
                  <div className="flex justify-between text-sm text-[var(--text-2)]">
                    <span>الشحن</span>
                    <span className={shipping === 0 ? "text-green-600" : ""}>{shipping === 0 ? "مجاني" : `${shipping.toLocaleString("ar")} ﷼`}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>خصم الكوبون</span><span>- {discount.toLocaleString("ar")} ﷼</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-[var(--text-1)] border-t border-[var(--border)] pt-2">
                    <span>الإجمالي</span>
                    <span className="text-brand-700 dark:text-accent-400">{total.toLocaleString("ar")} ﷼</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer/>
    </div>
  );
}
