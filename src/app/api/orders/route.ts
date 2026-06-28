import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

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

    const subtotal = body.items.reduce((s, i) => s + i.subtotal, 0);
    const shipping = subtotal >= 50000 ? 0 : 2000;
    const total    = subtotal + shipping;
    const currency = "YER";

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id:      user.id,
        status:           "pending",
        payment_status:   "pending",
        subtotal,
        discount_amount:  0,
        shipping_fee:     shipping,
        total_amount:     total,
        currency,
        address_snapshot: body.address,
        notes:            body.notes || null,
      })
      .select("id, order_number")
      .single();

    if (orderError || !order) {
      console.error("Order insert error:", orderError);
      return NextResponse.json({ error: "فشل في إنشاء الطلب" }, { status: 500 });
    }

    const orderItems = body.items.map(item => ({
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
      await supabase.from("orders").delete().eq("id", order.id);
      return NextResponse.json({ error: "فشل في حفظ عناصر الطلب" }, { status: 500 });
    }

    // سجل الدفع مع Idempotency Key
    await supabase.from("payments").insert({
      order_id:        order.id,
      provider_code:   body.payment_method || "cod",
      method:          body.payment_method || "cod",
      amount:          total,
      currency,
      status:          "pending",
      idempotency_key: idempotencyKey ?? `order-${order.id}-${Date.now()}`,
    });

    // سجل الشحن
    await supabase.from("shipments").insert({
      order_id: order.id,
      status:   "pending",
    });

    return NextResponse.json({
      success:      true,
      order_id:     order.id,
      order_number: order.order_number,
      total,
      currency,
    });

  } catch (err) {
    console.error("Checkout API error:", err);
    return NextResponse.json({ error: "خطأ غير متوقع" }, { status: 500 });
  }
}
