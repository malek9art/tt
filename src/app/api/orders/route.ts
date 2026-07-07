import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { notifyNewOrder } from "@/lib/notifications";
import { checkStockAvailability, applyOrderStock } from "@/lib/admin/stock";
import { checkRateLimit, requestIp } from "@/lib/rate-limit";

// عميل service-role للتراجع فقط — جلسة العميل لا تملك صلاحية DELETE على
// orders/order_items (ولا يجب أن تملكها)، فتفشل عملية التراجع بصمت إن
// استُخدمت جلسة العميل نفسها، تاركةً طلباً معطوباً عالقاً في القاعدة
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

interface OrderItem {
  product_id:     string;
  variant_id:     string | null;
  name_snapshot:  string;
  sku_snapshot:   string | null;
  attrs_snapshot: Record<string, string>;
  price:          number;
  quantity:       number;
  subtotal:       number;
}

interface OrderPayload {
  items:           OrderItem[];
  address: {
    full_name:   string;
    phone:       string;
    governorate: string;
    district:    string;
    street:      string;
    landmark:    string;
    lat?:        number | null;
    lng?:        number | null;
  };
  payment_method:  string;
  notes:           string;
  coupon_code:     string;
  idempotency_key?: string;
}

interface ExistingOrder {
  id:           string;
  order_number: string;
  total_amount: number;
  currency:     string;
}

interface PaymentWithOrder {
  order_id: string;
  orders:   ExistingOrder | ExistingOrder[] | null;
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cs: { name: string; value: string; options: CookieOptions }[]) {
            try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
            catch { /* Server Components */ }
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    }

    // حد لمعدل إنشاء الطلبات لكل مستخدم — يمنع إغراق النظام بطلبات آلية متكررة
    const allowed = await checkRateLimit(`orders:${user.id}`, 10, 60);
    if (!allowed) {
      return NextResponse.json({ error: "طلبات كثيرة جداً — حاول مرة أخرى بعد قليل" }, { status: 429 });
    }

    const body: OrderPayload = await request.json();

    if (!body.items?.length) {
      return NextResponse.json({ error: "السلة فارغة" }, { status: 400 });
    }
    if (!body.address?.phone || !body.address?.governorate) {
      return NextResponse.json({ error: "بيانات التوصيل ناقصة" }, { status: 400 });
    }

    // ===== Idempotency: منع الطلبات المكررة =====
    const idempotencyKey = body.idempotency_key;
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from("payments")
        .select("order_id, orders(id, order_number, total_amount, currency)")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle() as { data: PaymentWithOrder | null };

      if (existing?.order_id) {
        const rawOrder = existing.orders;
        const order = Array.isArray(rawOrder) ? rawOrder[0] : rawOrder;
        return NextResponse.json({
          success:      true,
          order_id:     existing.order_id,
          order_number: order?.order_number ?? "",
          total:        order?.total_amount ?? 0,
          currency:     order?.currency ?? "YER",
          duplicate:    true,
        });
      }
    }

    // ===== الأسعار من قاعدة البيانات — لا نثق بأسعار المتصفح =====
    const productIds = [...new Set(body.items.map(i => i.product_id))];
    const variantIds = body.items.map(i => i.variant_id).filter((v): v is string => Boolean(v));

    const [{ data: dbProducts }, { data: dbVariants }] = await Promise.all([
      supabase.from("products").select("id, base_price, status").in("id", productIds),
      variantIds.length
        ? supabase.from("product_variants").select("id, product_id, price, is_active").in("id", variantIds)
        : Promise.resolve({ data: [] as { id: string; product_id: string; price: number; is_active: boolean }[] }),
    ]);

    const productMap = new Map((dbProducts ?? []).map(p => [p.id, p]));
    const variantMap = new Map((dbVariants ?? []).map(v => [v.id, v]));

    const items: OrderItem[] = [];
    for (const item of body.items) {
      const product = productMap.get(item.product_id);
      if (!product || product.status !== "published") {
        return NextResponse.json({ error: "أحد المنتجات لم يعد متوفراً — حدّث السلة" }, { status: 400 });
      }
      let price = product.base_price;
      if (item.variant_id) {
        const variant = variantMap.get(item.variant_id);
        if (!variant || !variant.is_active || variant.product_id !== item.product_id) {
          return NextResponse.json({ error: "أحد خيارات المنتج لم يعد متوفراً — حدّث السلة" }, { status: 400 });
        }
        price = variant.price;
      }
      const quantity = Math.max(1, Math.floor(item.quantity));
      items.push({ ...item, price, quantity, subtotal: price * quantity });
    }

    // إيقاف البيع التلقائي عند نفاد المخزون
    const shortages = await checkStockAvailability(items.map(i => ({
      variant_id: i.variant_id, name_snapshot: i.name_snapshot, quantity: i.quantity,
    })));
    if (shortages.length > 0) {
      return NextResponse.json({
        error: `الكمية المطلوبة غير متوفرة حالياً: ${shortages.join("، ")} — حدّث السلة`,
      }, { status: 409 });
    }

    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const currency = "YER";

    // قراءة حد الشحن المجاني من الإعدادات
    const { data: freeAboveSetting } = await supabase
      .from("settings").select("value").eq("key", "shipping.free_above").maybeSingle();
    const rawFree = freeAboveSetting?.value;
    const freeAbove = rawFree
      ? Number(typeof rawFree === "string" ? rawFree.replace(/^"|"$/g, "") : rawFree)
      : 50000;
    const shipping = subtotal >= freeAbove ? 0 : 2000;

    // التحقق من الكوبون وحساب الخصم — الحجز الفعلي (increment_coupon_uses) ذرّي
    // ويحدث هنا قبل إنشاء الطلب، حتى لا يُطبَّق خصم لكوبون استُنفد للتو من
    // طلب متزامن آخر بين لحظة التحقق ولحظة إتمام هذا الطلب
    let discount = 0;
    let couponId: string | null = null;
    if (body.coupon_code) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("id, discount_type, discount_value, min_order_amount, max_uses, current_uses, per_user_limit, valid_until, is_active")
        .eq("code", body.coupon_code.trim().toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (coupon) {
        const expired  = coupon.valid_until && new Date(coupon.valid_until) < new Date();
        const maxedOut = coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses;
        const belowMin = coupon.min_order_amount && subtotal < coupon.min_order_amount;

        let overUserLimit = false;
        if (!expired && !maxedOut && !belowMin && coupon.per_user_limit) {
          const { count } = await supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("customer_id", user.id)
            .eq("coupon_id", coupon.id)
            .neq("status", "cancelled");
          overUserLimit = (count ?? 0) >= coupon.per_user_limit;
        }

        if (!expired && !maxedOut && !belowMin && !overUserLimit) {
          const { data: claimed } = await supabase.rpc("increment_coupon_uses", { p_coupon_id: coupon.id });
          if (claimed) {
            discount = coupon.discount_type === "percentage"
              ? Math.round(subtotal * coupon.discount_value / 100)
              : Math.min(coupon.discount_value, subtotal);
            couponId = coupon.id;
          }
        }
      }
    }

    const total = subtotal + shipping - discount;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id:      user.id,
        status:           "pending",
        payment_status:   "pending",
        subtotal,
        discount_amount:  discount,
        shipping_fee:     shipping,
        total_amount:     total,
        currency,
        address_snapshot: body.address,
        notes:            body.notes || null,
        coupon_id:        couponId,
      })
      .select("id, order_number, tracking_token")
      .single();

    if (orderError || !order) {
      console.error("Order insert error:", orderError);
      if (couponId) await supabase.rpc("release_coupon_use", { p_coupon_id: couponId });
      return NextResponse.json({ error: "فشل في إنشاء الطلب" }, { status: 500 });
    }

    // تراجع كامل عن الطلب (وتحرير حجز الكوبون إن وُجد) عند فشل أي خطوة تالية —
    // عبر عميل service-role لأن جلسة العميل لا تملك صلاحية DELETE على هذه الجداول
    const rollbackOrder = async () => {
      const svc = serviceClient();
      await svc.from("payments").delete().eq("order_id", order.id);
      await svc.from("shipments").delete().eq("order_id", order.id);
      await svc.from("order_items").delete().eq("order_id", order.id);
      await svc.from("orders").delete().eq("id", order.id);
      if (couponId) await supabase.rpc("release_coupon_use", { p_coupon_id: couponId });
    };

    const orderItems = items.map(item => ({
      order_id:       order.id,
      product_id:     item.product_id,
      variant_id:     item.variant_id,
      name_snapshot:  item.name_snapshot,
      sku_snapshot:   item.sku_snapshot,
      attrs_snapshot: item.attrs_snapshot,
      price:          item.price,
      quantity:       item.quantity,
      subtotal:       item.subtotal,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      await rollbackOrder();
      return NextResponse.json({ error: "فشل في حفظ عناصر الطلب" }, { status: 500 });
    }

    // سجل الدفع مع Idempotency Key — القيد الفريد على العمود في القاعدة
    // يحسم أي سباق بين طلبين متزامنين لنفس المفتاح (23505 عند التصادم)
    const finalIdempotencyKey = idempotencyKey ?? `order-${order.id}-${Date.now()}`;
    const { error: paymentError } = await supabase.from("payments").insert({
      order_id:        order.id,
      provider_code:   body.payment_method || "cod",
      method:          body.payment_method || "cod",
      amount:          total,
      currency,
      status:          "pending",
      idempotency_key: finalIdempotencyKey,
    });

    if (paymentError) {
      await rollbackOrder();
      if (paymentError.code === "23505" && idempotencyKey) {
        // طلب مكرر فعلاً — طلب آخر بنفس المفتاح سبقنا بجزء من الثانية
        const { data: existing } = await supabase
          .from("payments")
          .select("order_id, orders(id, order_number, total_amount, currency)")
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle() as { data: PaymentWithOrder | null };
        if (existing?.order_id) {
          const rawOrder = existing.orders;
          const dupOrder = Array.isArray(rawOrder) ? rawOrder[0] : rawOrder;
          return NextResponse.json({
            success: true, order_id: existing.order_id,
            order_number: dupOrder?.order_number ?? "", total: dupOrder?.total_amount ?? 0,
            currency: dupOrder?.currency ?? "YER", duplicate: true,
          });
        }
      }
      console.error("Payment insert error:", paymentError);
      return NextResponse.json({ error: "فشل في تسجيل الدفعة" }, { status: 500 });
    }

    // سجل الشحن
    const { error: shipmentError } = await supabase.from("shipments").insert({
      order_id: order.id,
      status:   "pending",
    });

    if (shipmentError) {
      await rollbackOrder();
      console.error("Shipment insert error:", shipmentError);
      return NextResponse.json({ error: "فشل في تسجيل الشحنة" }, { status: 500 });
    }

    // خصم المخزون + قيد حركة بيع لكل عنصر (fire-and-forget — applyOrderStock
    // تلتقط أخطاءها داخلياً لكل عنصر ولا ترمي استثناء أبداً)
    applyOrderStock(order.id, order.order_number,
      items.map(i => ({ variant_id: i.variant_id, name_snapshot: i.name_snapshot, quantity: i.quantity })),
      "sale",
    );

    // إشعار الأدمن بالطلب الجديد (fire-and-forget)
    notifyNewOrder(order.order_number, order.id, total).catch(() => {});

    return NextResponse.json({
      success:        true,
      order_id:       order.id,
      order_number:   order.order_number,
      tracking_token: order.tracking_token,
      total,
      currency,
    });

  } catch (err) {
    console.error("Checkout API error:", err);
    return NextResponse.json({ error: "خطأ غير متوقع" }, { status: 500 });
  }
}
