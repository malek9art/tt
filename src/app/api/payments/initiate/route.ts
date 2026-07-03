import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { PaymentGateway } from "@/lib/payment/gateway";

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
      },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

    const body = await request.json() as {
      orderId: string;
      orderNumber: string;
      amount: number;
      currency?: string;
      providerCode: string;
      returnUrl?: string;
    };

    if (!body.orderId || !body.providerCode) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    // Verify order belongs to this user
    const { data: order } = await supabase
      .from("orders")
      .select("id, total_amount, currency")
      .eq("id", body.orderId)
      .eq("customer_id", user.id)
      .single();

    if (!order) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

    // فرض حدود الوسيلة المضبوطة من لوحة الإدارة — خط دفاع خادمي
    const { data: providerRow } = await supabase
      .from("payment_providers")
      .select("min_amount, max_amount")
      .eq("code", body.providerCode)
      .eq("is_active", true)
      .maybeSingle();
    if (providerRow) {
      const total = Number(order.total_amount);
      if (providerRow.min_amount != null && total < Number(providerRow.min_amount)) {
        return NextResponse.json({ error: `هذه الوسيلة تتطلب حداً أدنى ${Number(providerRow.min_amount).toLocaleString("ar")} ﷼` }, { status: 400 });
      }
      if (providerRow.max_amount != null && Number(providerRow.max_amount) > 0 && total > Number(providerRow.max_amount)) {
        return NextResponse.json({ error: `هذه الوسيلة لا تقبل أكثر من ${Number(providerRow.max_amount).toLocaleString("ar")} ﷼` }, { status: 400 });
      }
    }

    const result = await PaymentGateway.initiate({
      orderId:       order.id,
      orderNumber:   body.orderNumber,
      amount:        order.total_amount,
      currency:      order.currency ?? "YER",
      providerCode:  body.providerCode,
      customerPhone: user.phone ?? undefined,
      returnUrl:     body.returnUrl,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err) {
    console.error("POST /api/payments/initiate:", err);
    return NextResponse.json({ error: "خطأ غير متوقع" }, { status: 500 });
  }
}
