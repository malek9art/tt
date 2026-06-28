import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

interface OrderItem {
  product_id:    string;
  variant_id:    string | null;
  name_snapshot: string;
  sku_snapshot:  string | null;
  attrs_snapshot: Record<string, string>;
  price:         number;
  quantity:      number;
  subtotal:      number;
}

interface OrderPayload {
  items:          OrderItem[];
  address: {
    full_name:   string;
    phone:       string;
    governorate: string;
    district:    string;
    street:      string;
    landmark:    string;
  };
  payment_method: string;
  notes:          string;
  coupon_code:    string;
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
            catch { /* */ }
          },
        },
      }
    );

    // التحقق من الجلسة — الطلب يتطلب تسجيل دخول
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    }

    const body: OrderPayload = await request.json();

    // التحقق من البيانات الأساسية
    if (!body.items?.length) {
      return NextResponse.json({ error: "السلة فارغة" }, { status: 400 });
    }
    if (!body.address?.phone || !body.address?.governorate) {
      return NextResponse.json({ error: "بيانات التوصيل ناقصة" }, { status: 400 });
    }

    // حساب المجاميع
    const subtotal = body.items.reduce((s, i) => s + i.subtotal, 0);
    const shipping = subtotal >= 50000 ? 0 : 2000;
    const total    = subtotal + shipping;
    const currency = "YER";

    // ===== إنشاء الطلب =====
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

    // ===== إضافة عناصر الطلب =====
    const orderItems = body.items.map(item => ({
      order_id:      order.id,
      product_id:    item.product_id,
      variant_id:    item.variant_id,
      name_snapshot: item.name_snapshot,
      sku_snapshot:  item.sku_snapshot,
      attrs_snapshot: item.attrs_snapshot,
      price:         item.price,
      quantity:      item.quantity,
      subtotal:      item.subtotal,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Order items error:", itemsError);
      // نحذف الطلب إن فشل إدراج العناصر
      await supabase.from("orders").delete().eq("id", order.id);
      return NextResponse.json({ error: "فشل في حفظ عناصر الطلب" }, { status: 500 });
    }

    // ===== إنشاء سجل الشحن =====
    await supabase.from("shipments").insert({
      order_id: order.id,
      status:   "pending",
    });

    // ===== سجل التدقيق (Audit Log) — عبر service_role لاحقاً =====

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
