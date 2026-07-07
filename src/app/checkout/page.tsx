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
import QRCode from "react-qr-code";
import { formatPrice } from "@/lib/api";
import {
  HiMapPin, HiPhone, HiUser, HiChevronDown, HiCheckCircle,
  HiArrowLeft, HiBookmark, HiTag, HiXMark, HiClipboard,
  HiCheck, HiExclamationCircle, HiClock, HiShieldCheck,
} from "react-icons/hi2";
import type { PaymentInstruction } from "@/lib/payment/types";
import LocationPicker, { type GeoPoint } from "@/components/map/LocationPicker";
import ReceiptAttach from "@/components/payment/ReceiptAttach";
import { GOVERNORATES } from "@/lib/governorates";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const GOVS = GOVERNORATES;

type Step = "info" | "payment" | "processing" | "confirm";

interface SavedAddress {
  id: string; label: string|null; full_name: string; phone: string;
  governorate: string; district: string|null; street: string|null;
  landmark: string|null; is_default: boolean;
  geo_lat: number|null; geo_lng: number|null;
}

interface Coupon {
  id: string; code: string; type: string; value: number; min_order_amount: number|null;
}

interface Provider {
  code: string; name: string;
  min_amount?: number | null;
  max_amount?: number | null;
  config?: { fee_percent?: string; fee_fixed?: string } & Record<string, string>;
  metadata: {
    icon: string; name_ar: string; description: string;
    type: string; confirmation: string; logo_url?: string;
  };
}

// نص وصف رسوم المزود إن وُجدت (للعرض فقط — يتحملها العميل عند التحويل)
function providerFeeLabel(p: Provider): string | null {
  const pct   = Number(p.config?.fee_percent ?? 0);
  const fixed = Number(p.config?.fee_fixed ?? 0);
  if (!pct && !fixed) return null;
  const parts: string[] = [];
  if (pct)   parts.push(`${pct}%`);
  if (fixed) parts.push(`${fixed.toLocaleString("ar")} ﷼`);
  return `رسوم المزود ${parts.join(" + ")} يتحملها العميل عند التحويل`;
}

// Checkout payment sections — grouped by provider type
const PAYMENT_SECTIONS: Array<{ key: string; title: string; emoji: string; types: string[] }> = [
  { key:"cod",     title:"الدفع عند الاستلام",   emoji:"💵", types:["cod"] },
  { key:"wallets", title:"المحافظ الإلكترونية",  emoji:"📱", types:["manual_wallet"] },
  { key:"points",  title:"شبكات ونقاط التحويل",  emoji:"🏦", types:["transfer_point"] },
  { key:"banks",   title:"التحويل البنكي",        emoji:"🏛️", types:["bank_transfer"] },
  { key:"cards",   title:"البطاقات الدولية",      emoji:"💳", types:["stripe"] },
];

interface TransferPoint { id: string; label: string; phone: string; accountName?: string; notes?: string; iconUrl?: string; qrValue?: string; }
interface CurrencyAccount { currency: string; label: string; number: string; }

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
  instruction, orderNumber, amount, preview = false,
}: { instruction: PaymentInstruction; orderNumber?: string; amount: number; preview?: boolean }) {
  const extra = instruction.extra as Record<string, unknown> | undefined;
  const points = (extra?.points ?? []) as TransferPoint[];
  const networkName = extra?.networkName as string | undefined;
  const accounts = (extra?.accounts ?? []) as CurrencyAccount[];
  const walletPhone = extra?.walletPhone as string | undefined;

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

      {/* رقم المحفظة مع QR */}
      {walletPhone && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-page)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">رقم المحفظة</p>
              <p className="font-bold text-lg text-brand-700 dark:text-accent-400" dir="ltr">{walletPhone}</p>
            </div>
            <CopyButton text={walletPhone}/>
          </div>
          <div className="mt-3 flex items-center justify-center rounded-lg bg-white p-3">
            <QRCode value={walletPhone} size={96}/>
          </div>
        </div>
      )}

      {/* حسابات متعددة العملات */}
      {accounts.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[var(--text-1)]">أرقام الحسابات حسب العملة:</p>
          {accounts.map(acc => (
            <div key={acc.currency}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 gap-3">
              <div className="min-w-0">
                <p className="text-xs text-[var(--text-muted)]">{acc.label} ({acc.currency})</p>
                <p className="font-bold text-brand-700 dark:text-accent-400 tracking-wider break-all" dir="ltr">{acc.number}</p>
              </div>
              <CopyButton text={acc.number} />
            </div>
          ))}
          {instruction.accountName && (
            <p className="text-sm text-[var(--text-2)]">الاسم: {instruction.accountName}</p>
          )}
          {instruction.bankName && (
            <p className="text-sm text-[var(--text-2)]">البنك: {instruction.bankName}</p>
          )}
        </div>
      )}

      {/* تفاصيل الحساب (محافظ/بنوك) — حساب واحد */}
      {accounts.length === 0 && instruction.accountNumber && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-page)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">رقم الحساب / المحفظة</span>
            <CopyButton text={instruction.accountNumber} />
          </div>
          <p className="text-xl font-bold text-brand-700 dark:text-accent-400 tracking-wider break-all" dir="ltr">
            {instruction.accountNumber}
          </p>
          {instruction.accountName && (
            <p className="text-sm text-[var(--text-2)]">الاسم: {instruction.accountName}</p>
          )}
        </div>
      )}

      {/* رقم المرجع */}
      {preview ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-page)] px-4 py-3">
          <p className="text-xs text-[var(--text-muted)]">رقم الطلب المرجعي</p>
          <p className="text-sm text-[var(--text-2)]">سيُنشأ تلقائياً بعد تأكيد الطلب، وستحتاج لكتابته في بيان التحويل</p>
        </div>
      ) : orderNumber && (
        <div className="flex items-center justify-between rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-page)] px-4 py-3">
          <div>
            <p className="text-xs text-[var(--text-muted)]">رقم الطلب المرجعي</p>
            <p className="font-bold text-[var(--text-1)]" dir="ltr">{orderNumber}</p>
          </div>
          <CopyButton text={orderNumber} />
        </div>
      )}

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
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-page)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {pt.iconUrl ? (
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white border border-[var(--border)]">
                      <Image src={pt.iconUrl} alt={pt.label} fill className="object-contain p-0.5" unoptimized/>
                    </span>
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900/30 text-lg">🏦</span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-1)] truncate">{pt.label}</p>
                    {pt.accountName && <p className="text-xs text-[var(--text-muted)]">{pt.accountName}</p>}
                    {pt.notes && <p className="text-xs text-[var(--text-muted)]">{pt.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="font-bold text-brand-700 dark:text-accent-400 text-sm" dir="ltr">{pt.phone}</p>
                  <CopyButton text={pt.phone} />
                </div>
              </div>
              {/* باركود رقم النقطة (أو قيمة QR المخصصة من الإدارة) */}
              <div className="mt-3 flex items-center justify-center rounded-lg bg-white p-3">
                <QRCode value={pt.qrValue || pt.phone} size={96} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── Customer Receipt Attachment (مكوّن مشترك) ────────
// انظر src/components/payment/ReceiptAttach.tsx — يُستخدم هنا وفي صفحة تفاصيل الطلب

// ── Main Component ───────────────────────────────────
export default function CheckoutPage() {
  const router  = useRouter();
  const { items, totalPrice, clearCart } = useCartStore();
  const { user, loading: authLoading } = useAuthStore();

  const [step,           setStep]          = useState<Step>("info");
  const [providerCode,   setProviderCode]  = useState("cod");
  const [providers,      setProviders]     = useState<Provider[]>([]);
  const [loading,        setLoading]       = useState(false);
  const [orderNum,       setOrderNum]      = useState("");
  const [orderId,        setOrderId]       = useState("");
  const [trackToken,     setTrackToken]    = useState("");
  const [totalFinal,     setTotalFinal]    = useState(0);
  const [instruction,    setInstruction]   = useState<PaymentInstruction | null>(null);
  const [paymentId,      setPaymentId]     = useState("");
  const [error,          setError]         = useState("");
  const [savedAddresses, setSavedAddresses]= useState<SavedAddress[]>([]);
  const [selectedAddr,   setSelectedAddr]  = useState<string|null>(null);
  const [showAddrList,   setShowAddrList]  = useState(false);
  const [couponCode,     setCouponCode]    = useState("");
  const [coupon,         setCoupon]        = useState<Coupon|null>(null);
  const [couponLoading,  setCouponLoading] = useState(false);
  const [couponError,    setCouponError]   = useState("");
  const [preview,        setPreview]       = useState<PaymentInstruction | null>(null);
  const [previewLoading, setPreviewLoading]= useState(false);

  const [form, setForm] = useState({
    full_name:"", phone:"", governorate:"تعز",
    district:"", street:"", landmark:"", notes:"",
  });
  const [geo,         setGeo]         = useState<GeoPoint|null>(null);
  const [saveAddress, setSaveAddress] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{ full_name?: string; phone?: string }>({});
  const setF = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setFieldErrors(fe => ({ ...fe, [k]: undefined }));
  };

  useEffect(() => {
    // ننتظر تحميل الجلسة أولاً — وإلا يُقذف المستخدم المسجّل إلى صفحة الدخول
    if (!authLoading && !user) router.replace("/login?redirectTo=/checkout");
  }, [user, authLoading, router]);

  // Load active providers — الاختيار الافتراضي يتجاوز الوسائل خارج حدود المبلغ
  useEffect(() => {
    fetch("/api/payments/providers")
      .then(r => r.json())
      .then(d => {
        const list: Provider[] = (d.providers ?? []);
        setProviders(list);
        const inRange = (p: Provider) => {
          const t = totalPrice();
          if (p.min_amount != null && t < Number(p.min_amount)) return false;
          if (p.max_amount != null && Number(p.max_amount) > 0 && t > Number(p.max_amount)) return false;
          return true;
        };
        const current = list.find(p => p.code === providerCode);
        if (!current || !inRange(current)) {
          const firstOk = list.find(inRange) ?? list[0];
          if (firstOk) setProviderCode(firstOk.code);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // معاينة تفاصيل الدفع (حساب/محفظة/نقاط تحويل) لطريقة الدفع المختارة —
  // تظهر للعميل قبل تأكيد الطلب، دون إنشاء أي سجل دفع فعلي
  useEffect(() => {
    const p = providers.find(x => x.code === providerCode);
    const isManual = p?.metadata?.confirmation === "manual";
    if (!isManual) { setPreview(null); return; }

    setPreviewLoading(true);
    fetch(`/api/payments/preview?code=${encodeURIComponent(providerCode)}&amount=${totalPrice()}&currency=YER`)
      .then(r => r.json())
      .then(d => setPreview(d.instruction ?? null))
      .catch(() => setPreview(null))
      .finally(() => setPreviewLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerCode, providers]);

  const loadAddresses = useCallback(async () => {
    if (!user) return;
    const { data } = await sb
      .from("addresses")
      .select("id,label,full_name,phone,governorate,district,street,landmark,is_default,geo_lat,geo_lng")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false });
    const addrs = (data as SavedAddress[]) ?? [];
    setSavedAddresses(addrs);
    const def = addrs.find(a => a.is_default);
    if (def) applyAddress(def);
  }, [user]);

  useEffect(() => { loadAddresses(); }, [loadAddresses]);

  const applyAddress = (addr: SavedAddress) => {
    setForm({ full_name: addr.full_name ?? "", phone: addr.phone ?? "", governorate: addr.governorate,
      district: addr.district ?? "", street: addr.street ?? "",
      landmark: addr.landmark ?? "", notes: "" });
    setGeo(addr.geo_lat != null && addr.geo_lng != null
      ? { lat: Number(addr.geo_lat), lng: Number(addr.geo_lng) }
      : null);
    setSelectedAddr(addr.id);
    setShowAddrList(false);
    setFieldErrors({});
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

  // Step 1 → 2 — تحقق فوري مع رسالة تحت كل حقل
  const goToPayment = () => {
    const errs: { full_name?: string; phone?: string } = {};
    const name  = form.full_name.trim();
    const phone = form.phone.replace(/[\s-]/g, "");
    if (name.length < 3) errs.full_name = "أدخل الاسم الكامل (3 أحرف على الأقل)";
    if (!phone)          errs.phone = "أدخل رقم الهاتف";
    else if (!/^(\+?967)?0?7\d{8}$/.test(phone)) errs.phone = "أدخل رقم جوال يمني صحيح — مثال: 7XXXXXXXX";
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setError(""); setStep("payment");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Step 2 → Create order → initiate payment
  const handleSubmit = async () => {
    if (!items.length) { setError("السلة فارغة"); return; }
    setLoading(true); setError("");

    // حفظ العنوان الجديد تلقائياً لتسريع الطلبات القادمة
    if (saveAddress && user && !selectedAddr) {
      await sb.from("addresses").insert({
        user_id: user.id,
        full_name: form.full_name.trim(), phone: form.phone.trim(),
        governorate: form.governorate,
        district: form.district || null, street: form.street || null,
        landmark: form.landmark || null,
        geo_lat: geo?.lat ?? null, geo_lng: geo?.lng ?? null,
        is_default: savedAddresses.length === 0,
      }).then(({ error: e }) => { if (e) console.error("saveAddress:", e); });
    }

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
        address: { ...form, lat: geo?.lat ?? null, lng: geo?.lng ?? null },
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
    setTrackToken(orderData.tracking_token ?? "");
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
    setPaymentId(payData.paymentId ?? "");
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
              <div className="mt-1 flex items-center justify-center gap-2">
                <p className="text-3xl font-bold text-brand-700 dark:text-accent-400" dir="ltr">
                  #{orderNum}
                </p>
                <CopyButton text={orderNum}/>
              </div>
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
                {instruction.type === "transfer_details" && paymentId && (
                  <ReceiptAttach paymentId={paymentId} />
                )}
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

            {trackToken && (
              <Link href={`/track/${trackToken}`}
                className="card-base p-4 flex items-center justify-between gap-3 hover:border-brand-400 transition-colors group">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/30 text-xl">📦</span>
                  <div>
                    <p className="font-semibold text-sm text-[var(--text-1)]">تتبع طلبك لحظة بلحظة</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">احفظ هذا الرابط لمتابعة حالة التوصيل</p>
                  </div>
                </div>
                <HiArrowLeft className="text-brand-700 dark:text-accent-400 group-hover:-translate-x-1 transition-transform"/>
              </Link>
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
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
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
                            autoComplete="name"
                            onChange={e => setF("full_name", e.target.value)}
                            className={`${iCls} pe-9 ${fieldErrors.full_name ? "!border-red-400" : ""}`}/>
                        </div>
                        {fieldErrors.full_name && <p className="mt-1 text-xs text-red-500">{fieldErrors.full_name}</p>}
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">رقم الهاتف *</label>
                        <div className="relative">
                          <HiPhone className="absolute top-3.5 end-3 text-sm text-[var(--text-muted)]"/>
                          <input type="tel" dir="ltr" inputMode="tel" placeholder="7XXXXXXXX" value={form.phone}
                            autoComplete="tel"
                            onChange={e => setF("phone", e.target.value)}
                            className={`${iCls} pe-9 ${fieldErrors.phone ? "!border-red-400" : ""}`}/>
                        </div>
                        {fieldErrors.phone && <p className="mt-1 text-xs text-red-500">{fieldErrors.phone}</p>}
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

                      {/* تحديد الموقع على الخريطة */}
                      <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-xs font-medium text-[var(--text-2)]">
                          📍 موقع التوصيل على الخريطة (اختياري — يساعد المندوب في الوصول إليك بسرعة)
                        </label>
                        <LocationPicker value={geo} onChange={setGeo}/>
                      </div>

                      {/* حفظ العنوان للطلبات القادمة */}
                      {user && !selectedAddr && (
                        <div className="sm:col-span-2">
                          <label className="flex items-center gap-2.5 cursor-pointer rounded-xl border border-[var(--border)] px-4 py-3 hover:border-brand-300 transition-colors">
                            <input type="checkbox" checked={saveAddress}
                              onChange={e => setSaveAddress(e.target.checked)}
                              className="h-4 w-4 rounded text-brand-700"/>
                            <span className="text-sm text-[var(--text-1)]">
                              احفظ هذا العنوان لتسريع طلباتي القادمة
                            </span>
                          </label>
                        </div>
                      )}
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
                  {/* ملخص عنوان التوصيل مع إمكانية التعديل */}
                  <div className="flex items-start justify-between gap-3 rounded-xl bg-[var(--bg-page)] border border-[var(--border)] p-3.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <HiMapPin className="text-brand-700 dark:text-accent-400 mt-0.5 shrink-0"/>
                      <div className="min-w-0 text-sm">
                        <p className="font-semibold text-[var(--text-1)] truncate">
                          {form.full_name} — <span dir="ltr">{form.phone}</span>
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                          {form.governorate}{form.district && ` · ${form.district}`}{form.street && ` · ${form.street}`}
                          {geo && " · 📍 موقع محدد على الخريطة"}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setStep("info")}
                      className="shrink-0 text-xs font-medium text-brand-700 dark:text-accent-400 hover:underline">
                      تعديل
                    </button>
                  </div>

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
                                // فرض حدود المبلغ المضبوطة من لوحة الإدارة
                                const belowMin = p.min_amount != null && total < Number(p.min_amount);
                                const aboveMax = p.max_amount != null && Number(p.max_amount) > 0 && total > Number(p.max_amount);
                                const outOfRange = belowMin || aboveMax;
                                const feeLabel = providerFeeLabel(p);
                                return (
                                  <label key={p.code}
                                    className={`flex items-center gap-3.5 rounded-xl border p-3.5 transition-all ${
                                      outOfRange
                                        ? "border-[var(--border)] opacity-50 cursor-not-allowed"
                                        : providerCode === p.code
                                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30 cursor-pointer"
                                        : "border-[var(--border)] hover:border-brand-300 cursor-pointer"
                                    }`}>
                                    <input type="radio" name="provider" value={p.code}
                                      checked={providerCode === p.code}
                                      disabled={outOfRange}
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
                                        {outOfRange && (
                                          <span className="text-[10px] rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 px-1.5 py-0.5">
                                            {belowMin
                                              ? `الحد الأدنى ${Number(p.min_amount).toLocaleString("ar")} ﷼`
                                              : `الحد الأعلى ${Number(p.max_amount).toLocaleString("ar")} ﷼`}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{meta.description}</p>
                                      {feeLabel && !outOfRange && (
                                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">💱 {feeLabel}</p>
                                      )}
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

                  {/* معاينة تفاصيل الدفع لطريقة الدفع اليدوية المختارة */}
                  {previewLoading && (
                    <div className="h-24 rounded-xl bg-[var(--border)] animate-pulse"/>
                  )}
                  {!previewLoading && preview && (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-page)]/50 p-4 space-y-3">
                      <h3 className="text-sm font-bold text-[var(--text-1)] flex items-center gap-2">
                        <HiShieldCheck className="text-brand-700 dark:text-accent-400"/> تفاصيل الدفع لهذه الطريقة
                      </h3>
                      <PaymentInstructions instruction={preview} amount={total} preview/>
                      <p className="text-xs text-[var(--text-muted)]">
                        هذه معاينة — سيُنشأ رقم مرجعي فعلي مخصص لطلبك بعد الضغط على "تأكيد الطلب"
                      </p>
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
                          className={`${iCls} min-w-0 flex-1 uppercase`}/>
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
                    <span className={shipping === 0 ? "text-green-600" : ""}>{shipping === 0 ? "مجاني 🎉" : `${shipping.toLocaleString("ar")} ﷼`}</span>
                  </div>
                  {shipping > 0 && (
                    <div className="rounded-lg bg-accent-500/10 border border-accent-500/30 px-3 py-2 text-xs text-[var(--text-2)]">
                      🚚 أضف منتجات بقيمة{" "}
                      <b className="text-brand-700 dark:text-accent-400">{(50000 - subtotal).toLocaleString("ar")} ﷼</b>{" "}
                      لتحصل على شحن مجاني
                    </div>
                  )}
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
