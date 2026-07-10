import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { PaymentGateway } from "@/lib/payment/gateway";
import { notifyCustomerOrderStatus } from "@/lib/notifications";
import { applyOrderStock } from "@/lib/admin/stock";
import { recordCashCollection } from "@/lib/driver-cash";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  delivered: "تم تسليم طلبك بنجاح ✅",
  returned:  "تم إرجاع طلبك",
};

async function getDriverSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
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
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getDriverSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;

  // التحقق من أن المندوب هو صاحب الشحنة
  const { data: shipment } = await supabase
    .from("shipments")
    .select("driver_id, status, order_id")
    .eq("id", id)
    .single();

  if (!shipment || shipment.driver_id !== user.id) {
    return NextResponse.json({ error: "غير مصرح لهذه الشحنة" }, { status: 403 });
  }

  const body = await request.json();
  const { status, carrier_notes, proof_photo_url } = body;

  const VALID_STATUSES = ["picked_up","out_for_delivery","delivered","failed","returned"];
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
  }

  const updates: Record<string,unknown> = { status, carrier_notes: carrier_notes || null };
  const now = new Date().toISOString();
  if (status === "picked_up")        updates.picked_up_at = now;
  if (status === "delivered")        updates.delivered_at = now;
  if (proof_photo_url)               updates.proof_photo_url = proof_photo_url;

  const { error: dbErr } = await supabase
    .from("shipments").update(updates).eq("id", id);

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  // ربط تسليم/إرجاع الشحنة بحالة الطلب — لم يكن مربوطاً إطلاقاً سابقاً، فيبقى
  // الطلب "قيد التوصيل" في لوحة الإدارة حتى لو سلّمه المندوب فعلياً
  if (status === "delivered" || status === "returned") {
    const sb = svc();
    const { data: order } = await sb
      .from("orders")
      .select("id, order_number, customer_id, payment_status, total_amount, order_items(variant_id, name_snapshot, quantity)")
      .eq("id", shipment.order_id)
      .single();

    if (order) {
      if (status === "delivered") {
        // COD يُعتبر مدفوعاً تلقائياً عند تأكيد المندوب للتسليم
        if (order.payment_status !== "paid") {
          const { data: payment } = await sb
            .from("payments")
            .select("id, provider_code, status")
            .eq("order_id", order.id)
            .eq("provider_code", "cod")
            .maybeSingle();
          if (payment && payment.status !== "paid") {
            await PaymentGateway.confirmManual({ paymentId: payment.id, adminUserId: user.id });
            // تسجيل المبلغ المُحصَّل نقداً في عهدة المندوب — مرة واحدة فقط
            // بفضل شرط payment_status !== "paid" أعلاه (لا يُعاد الدخول هنا)
            recordCashCollection(user.id, order.total_amount, order.id, id).catch(() => {});
          }
        }
        // confirmManual (إن نُفِّذ) يضبط حالة الطلب على "confirmed" — نعيدها
        // هنا إلى "delivered" لأن الطلب فعلياً سُلِّم، لا قيد المعالجة
        await sb.from("orders").update({ status: "delivered" }).eq("id", order.id);
      } else {
        // إرجاع الشحنة — إعادة الكميات للمخزون كما في إلغاء الطلب
        await sb.from("orders").update({ status: "returned" }).eq("id", order.id);
        const items = ((order.order_items ?? []) as { variant_id: string | null; name_snapshot: string; quantity: number }[])
          .map(i => ({ variant_id: i.variant_id, name_snapshot: i.name_snapshot, quantity: i.quantity }));
        applyOrderStock(order.id, order.order_number, items, "return");
      }

      const label = ORDER_STATUS_LABELS[status];
      if (label) notifyCustomerOrderStatus(order.customer_id, order.order_number, label).catch(() => {});
    }
  }

  return NextResponse.json({ success: true, status });
}
