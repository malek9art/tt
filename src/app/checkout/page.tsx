"use client";
import { useState, useEffect, useCallback } from "react";
import { useCartStore }  from "@/store/cartStore";
import { useAuthStore }  from "@/store/authStore";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Image  from "next/image";
import Link   from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { formatPrice } from "@/lib/api";
import {
  MapPin, Phone, User, ChevronDown, Banknote,
  Wallet, CheckCircle, Loader2, ChevronLeft,
  BookMarked, Tag, X
} from "lucide-react";

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

type Step = "info" | "payment" | "confirm";

interface SavedAddress {
  id: string; label: string|null; full_name: string; phone: string;
  governorate: string; district: string|null; street: string|null;
  landmark: string|null; is_default: boolean;
}

interface Coupon {
  id: string; code: string; type: string;
  value: number; min_order_amount: number|null;
}

const iCls = "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-sm text-[var(--text-1)] outline-none focus:border-brand-500 transition-colors";

export default function CheckoutPage() {
  const router   = useRouter();
  const { items, totalAmount, clearCart } = useCartStore();
  const { user } = useAuthStore();

  const [step,          setStep]          = useState<Step>("info");
  const [payment,       setPayment]       = useState("cod");
  const [loading,       setLoading]       = useState(false);
  const [orderNum,      setOrderNum]      = useState("");
  const [error,         setError]         = useState("");
  const [savedAddresses,setSavedAddresses]= useState<SavedAddress[]>([]);
  const [selectedAddr,  setSelectedAddr]  = useState<string|null>(null);
  const [showAddrList,  setShowAddrList]  = useState(false);
  const [couponCode,    setCouponCode]    = useState("");
  const [coupon,        setCoupon]        = useState<Coupon|null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError,   setCouponError]   = useState("");

  const [form, setForm] = useState({
    full_name:"", phone:"", governorate:"تعز",
    district:"", street:"", landmark:"",
    notes:"",
  });
  const setF = (k:string, v:string) => setForm(f=>({...f,[k]:v}));

  // إعادة توجيه إذا لم يكن مسجّلاً
  useEffect(() => {
    if (!user) router.replace("/login?redirectTo=/checkout");
  }, [user, router]);

  // جلب العناوين المحفوظة
  const loadAddresses = useCallback(async () => {
    if (!user) return;
    const { data } = await sb
      .from("addresses")
      .select("id,label,full_name,phone,governorate,district,street,landmark,is_default")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false });
    const addrs = (data as SavedAddress[]) ?? [];
    setSavedAddresses(addrs);
    // اختيار الافتراضي تلقائياً
    const def = addrs.find(a => a.is_default);
    if (def) applyAddress(def);
  }, [user]);

  useEffect(() => { loadAddresses(); }, [loadAddresses]);

  const applyAddress = (addr: SavedAddress) => {
    setForm({
      full_name:   addr.full_name,
      phone:       addr.phone,
      governorate: addr.governorate,
      district:    addr.district   ?? "",
      street:      addr.street     ?? "",
      landmark:    addr.landmark   ?? "",
      notes:       "",
    });
    setSelectedAddr(addr.id);
    setShowAddrList(false);
  };

  // تطبيق كوبون
  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true); setCouponError("");
    const { data, error: dbErr } = await sb
      .from("coupons")
      .select("id,code,type,value,min_order_amount,max_uses,uses_count,expires_at,is_active")
      .eq("code", couponCode.trim().toUpperCase())
      .eq("is_active", true)
      .maybeSingle();

    if (dbErr || !data) {
      setCouponError("كود الكوبون غير صحيح أو منتهي الصلاحية");
      setCouponLoading(false); return;
    }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setCouponError("انتهت صلاحية هذا الكوبون");
      setCouponLoading(false); return;
    }
    if (data.max_uses !== null && data.uses_count >= data.max_uses) {
      setCouponError("استُنفدت الاستخدامات المتاحة لهذا الكوبون");
      setCouponLoading(false); return;
    }
    if (data.min_order_amount && subtotal < data.min_order_amount) {
      setCouponError(`الحد الأدنى لاستخدام هذا الكوبون ${data.min_order_amount.toLocaleString("ar")} ﷼`);
      setCouponLoading(false); return;
    }
    setCoupon(data as Coupon);
    setCouponLoading(false);
  };

  const removeCoupon = () => { setCoupon(null); setCouponCode(""); setCouponError(""); };

  // حساب الأسعار
  const subtotal    = totalAmount();
  const shipping    = subtotal >= 50000 ? 0 : 2000;
  const discount    = coupon
    ? coupon.type === "percentage"
      ? Math.round(subtotal * coupon.value / 100)
      : Math.min(coupon.value, subtotal)
    : 0;
  const total       = subtotal + shipping - discount;

  const handleSubmit = async () => {
    if (!form.full_name.trim()) { setError("أدخل الاسم الكامل"); return; }
    if (!form.phone.trim())     { setError("أدخل رقم الهاتف");    return; }
    if (!items.length)          { setError("السلة فارغة");         return; }

    setLoading(true); setError("");

    const orderItems = items.map(i => ({
      product_id:     i.product.id,
      variant_id:     i.variant?.id ?? null,
      name_snapshot:  i.product.name_ar,
      sku_snapshot:   i.variant?.sku ?? i.product.sku ?? null,
      attrs_snapshot: i.variant?.attributes ?? {},
      price:          i.variant?.price ?? i.product.base_price,
      quantity:       i.quantity,
      subtotal:       (i.variant?.price ?? i.product.base_price) * i.quantity,
    }));

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idempotency_key: `checkout-${user?.id}-${Date.now()}`,
        items:           orderItems,
        address:         { ...form },
        payment_method:  payment,
        notes:           form.notes,
        coupon_code:     coupon?.code ?? "",
        discount_amount: discount,
      }),
    });

    const d = await res.json();
    if (!res.ok || d.error) { setError(d.error ?? "خطأ — حاول مجدداً"); setLoading(false); return; }

    clearCart();
    setOrderNum(d.order_number);
    setStep("confirm");
    setLoading(false);
  };

  if (!items.length && step !== "confirm") {
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
        {/* شريط التقدم */}
        {step !== "confirm" && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {[
              { id:"info",    label:"معلومات التوصيل" },
              { id:"payment", label:"طريقة الدفع" },
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
                    {done ? <CheckCircle size={14}/> : idx + 1}
                  </div>
                  <span className={`text-sm ${current ? "font-semibold text-[var(--text-1)]" : "text-[var(--text-muted)]"}`}>
                    {label}
                  </span>
                  {idx < 1 && <ChevronLeft size={14} className="text-[var(--border)]"/>}
                </div>
              );
            })}
          </div>
        )}

        {/* شاشة التأكيد */}
        {step === "confirm" && (
          <div className="max-w-md mx-auto text-center py-12">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mx-auto mb-5">
              <CheckCircle size={40} className="text-green-500"/>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-1)] mb-2">تم استلام طلبك! 🎉</h1>
            <p className="text-[var(--text-muted)] mb-1">رقم الطلب:</p>
            <p className="text-3xl font-bold text-brand-700 dark:text-accent-400 mb-6" dir="ltr">
              #{orderNum}
            </p>
            <p className="text-sm text-[var(--text-muted)] mb-8">
              سيتواصل معك فريقنا لتأكيد الطلب وتحديد موعد التوصيل
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/account/orders" className="btn-primary gap-2">
                <CheckCircle size={16}/> متابعة طلباتي
              </Link>
              <Link href="/" className="btn-ghost border border-[var(--border)]">
                العودة للرئيسية
              </Link>
            </div>
          </div>
        )}

        {step !== "confirm" && (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-5">

              {/* ===== خطوة 1: معلومات التوصيل ===== */}
              {step === "info" && (
                <>
                  {/* العناوين المحفوظة */}
                  {savedAddresses.length > 0 && (
                    <div className="card-base p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-[var(--text-1)] flex items-center gap-2">
                          <BookMarked size={16} className="text-brand-700"/>
                          عناوين محفوظة
                        </h2>
                        <button onClick={() => setShowAddrList(!showAddrList)}
                          className="text-sm text-brand-700 dark:text-accent-400 hover:underline flex items-center gap-1">
                          {showAddrList ? "إخفاء" : "اختيار"}
                          <ChevronDown size={14} className={`transition-transform ${showAddrList?"rotate-180":""}`}/>
                        </button>
                      </div>
                      {selectedAddr && !showAddrList && (
                        <div className="rounded-lg bg-brand-50 dark:bg-brand-900/30 px-3 py-2 text-sm text-[var(--text-2)]">
                          {savedAddresses.find(a=>a.id===selectedAddr)?.full_name} — {savedAddresses.find(a=>a.id===selectedAddr)?.governorate}
                        </div>
                      )}
                      {showAddrList && (
                        <div className="space-y-2 mt-2">
                          {savedAddresses.map(addr => (
                            <button key={addr.id} onClick={() => applyAddress(addr)}
                              className={`w-full text-right rounded-xl border p-3.5 transition-all ${
                                selectedAddr===addr.id
                                  ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30"
                                  : "border-[var(--border)] hover:border-brand-300"
                              }`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm text-[var(--text-1)]">{addr.full_name}</p>
                                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                    {addr.governorate}{addr.district && ` · ${addr.district}`}
                                    {addr.street && ` · ${addr.street}`}
                                  </p>
                                </div>
                                {addr.is_default && (
                                  <span className="text-[10px] bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-accent-400 px-1.5 py-0.5 rounded">افتراضي</span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* نموذج العنوان */}
                  <div className="card-base p-5 space-y-4">
                    <h2 className="font-semibold text-[var(--text-1)] flex items-center gap-2 border-b border-[var(--border)] pb-3">
                      <MapPin size={16} className="text-brand-700"/> عنوان التوصيل
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">الاسم الكامل *</label>
                        <div className="relative">
                          <User size={14} className="absolute top-3.5 end-3 text-[var(--text-muted)]"/>
                          <input type="text" placeholder="محمد أحمد" value={form.full_name}
                            onChange={e=>setF("full_name",e.target.value)} className={iCls+" pe-9"}/>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">رقم الهاتف *</label>
                        <div className="relative">
                          <Phone size={14} className="absolute top-3.5 end-3 text-[var(--text-muted)]"/>
                          <input type="tel" dir="ltr" placeholder="7XXXXXXXX" value={form.phone}
                            onChange={e=>setF("phone",e.target.value)} className={iCls+" pe-9"}/>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">المحافظة *</label>
                        <div className="relative">
                          <select value={form.governorate} onChange={e=>setF("governorate",e.target.value)}
                            className={iCls+" appearance-none pe-9"}>
                            {GOVS.map(g=><option key={g} value={g}>{g}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute top-3.5 start-3 text-[var(--text-muted)] pointer-events-none"/>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">المديرية / الحي</label>
                        <input type="text" placeholder="اسم الحي أو المديرية" value={form.district}
                          onChange={e=>setF("district",e.target.value)} className={iCls}/>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">الشارع / العنوان التفصيلي</label>
                        <input type="text" placeholder="اسم الشارع، رقم المبنى..." value={form.street}
                          onChange={e=>setF("street",e.target.value)} className={iCls}/>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">علامة مميزة (اختياري)</label>
                        <input type="text" placeholder="بجانب مسجد، أمام محطة..." value={form.landmark}
                          onChange={e=>setF("landmark",e.target.value)} className={iCls}/>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">ملاحظات للتوصيل (اختياري)</label>
                        <textarea rows={2} placeholder="أي تعليمات إضافية للمندوب..." value={form.notes}
                          onChange={e=>setF("notes",e.target.value)} className={iCls+" resize-none"}/>
                      </div>
                    </div>
                    {error && <p className="text-sm text-red-500">⚠ {error}</p>}
                    <button onClick={() => {
                      if (!form.full_name.trim()) { setError("أدخل الاسم الكامل"); return; }
                      if (!form.phone.trim())     { setError("أدخل رقم الهاتف");    return; }
                      setError(""); setStep("payment");
                    }} className="btn-primary w-full justify-center py-3">
                      التالي — طريقة الدفع
                    </button>
                  </div>
                </>
              )}

              {/* ===== خطوة 2: طريقة الدفع ===== */}
              {step === "payment" && (
                <div className="card-base p-5 space-y-5">
                  <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3">
                    طريقة الدفع
                  </h2>
                  {[
                    { id:"cod",     icon:"💵", label:"الدفع عند الاستلام (COD)",    desc:"ادفع نقداً عند استلام طلبك" },
                    { id:"jawali",  icon:"📱", label:"جوالي",                        desc:"الدفع عبر تطبيق جوالي" },
                    { id:"floosak", icon:"💳", label:"فلوسك",                        desc:"الدفع عبر فلوسك" },
                  ].map(m => (
                    <label key={m.id} className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition-all ${
                      payment===m.id ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30" : "border-[var(--border)] hover:border-brand-300"
                    }`}>
                      <input type="radio" name="payment" value={m.id} checked={payment===m.id}
                        onChange={()=>setPayment(m.id)} className="h-4 w-4 text-brand-700"/>
                      <span className="text-2xl">{m.icon}</span>
                      <div>
                        <p className="font-semibold text-sm text-[var(--text-1)]">{m.label}</p>
                        <p className="text-xs text-[var(--text-muted)]">{m.desc}</p>
                      </div>
                    </label>
                  ))}

                  {/* كوبون الخصم */}
                  <div className="border-t border-[var(--border)] pt-4">
                    <h3 className="text-sm font-semibold text-[var(--text-1)] mb-3 flex items-center gap-2">
                      <Tag size={14} className="text-brand-700"/> كود خصم
                    </h3>
                    {coupon ? (
                      <div className="flex items-center justify-between rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3">
                        <div>
                          <p className="font-bold text-green-700 dark:text-green-400" dir="ltr">{coupon.code}</p>
                          <p className="text-xs text-green-600 dark:text-green-400">
                            خصم {coupon.type==="percentage" ? `${coupon.value}%` : `${coupon.value.toLocaleString("ar")} ﷼`}
                            {" "}= وفّرت {discount.toLocaleString("ar")} ﷼
                          </p>
                        </div>
                        <button onClick={removeCoupon} className="text-red-400 hover:text-red-600 transition-colors">
                          <X size={16}/>
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input type="text" dir="ltr" placeholder="SUMMER20" value={couponCode}
                          onChange={e=>{setCouponCode(e.target.value.toUpperCase());setCouponError("");}}
                          onKeyDown={e=>e.key==="Enter"&&applyCoupon()}
                          className={iCls+" flex-1 uppercase"}/>
                        <button onClick={applyCoupon} disabled={couponLoading||!couponCode}
                          className="btn-primary px-4 whitespace-nowrap">
                          {couponLoading ? <Loader2 size={14} className="animate-spin"/> : "تطبيق"}
                        </button>
                      </div>
                    )}
                    {couponError && <p className="mt-1 text-xs text-red-500">⚠ {couponError}</p>}
                  </div>

                  {error && <p className="text-sm text-red-500">⚠ {error}</p>}
                  <div className="flex gap-3">
                    <button onClick={()=>{setStep("info");setError("");}}
                      className="btn-ghost border border-[var(--border)] flex-1 justify-center">
                      ← السابق
                    </button>
                    <button onClick={handleSubmit} disabled={loading}
                      className="btn-primary flex-1 justify-center py-3">
                      {loading
                        ? <><Loader2 size={16} className="animate-spin"/> جارٍ الإرسال...</>
                        : <><Banknote size={16}/> تأكيد الطلب</>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ملخص الطلب */}
            <div className="space-y-4">
              <div className="card-base p-5 sticky top-20">
                <h2 className="font-semibold text-[var(--text-1)] border-b border-[var(--border)] pb-3 mb-4">
                  ملخص الطلب
                </h2>
                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                  {items.map(item => {
                    const price = item.variant?.price ?? item.product.base_price;
                    const img   = item.product.product_images?.find(i=>i.is_primary)?.url
                               ?? item.product.product_images?.[0]?.url;
                    return (
                      <div key={`${item.product.id}-${item.variant?.id??""}`}
                        className="flex items-center gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-brand-50">
                          {img
                            ? <Image src={img} alt={item.product.name_ar} fill sizes="48px" className="object-cover"/>
                            : <div className="flex h-full items-center justify-center text-lg">📱</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-1)] line-clamp-1">
                            {item.product.name_ar}
                          </p>
                          {item.variant && (
                            <p className="text-xs text-[var(--text-muted)]">
                              {Object.values(item.variant.attributes as Record<string,string>).join(" / ")}
                            </p>
                          )}
                          <p className="text-xs text-[var(--text-muted)]">× {item.quantity}</p>
                        </div>
                        <p className="text-sm font-bold text-[var(--text-1)] whitespace-nowrap">
                          {formatPrice(price * item.quantity, item.product.currency)}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-[var(--border)] pt-3 space-y-2">
                  <div className="flex justify-between text-sm text-[var(--text-2)]">
                    <span>المجموع الفرعي</span>
                    <span>{subtotal.toLocaleString("ar")} ﷼</span>
                  </div>
                  <div className="flex justify-between text-sm text-[var(--text-2)]">
                    <span>الشحن</span>
                    <span className={shipping===0?"text-green-600":""}>{shipping===0?"مجاني":`${shipping.toLocaleString("ar")} ﷼`}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>خصم الكوبون</span>
                      <span>- {discount.toLocaleString("ar")} ﷼</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-[var(--text-1)] border-t border-[var(--border)] pt-2 mt-2">
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
