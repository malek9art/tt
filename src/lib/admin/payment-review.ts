import { createClient } from "@supabase/supabase-js";
import { notifyCustomerPayment } from "@/lib/notifications";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/**
 * بعد كل إجراء مراجعة دفع (تأكيد/رفض/طلب تعديل/استرجاع):
 * 1) إشعار العميل بالنتيجة  2) تسجيل الإجراء في سجل التدقيق
 * لا يُفشل المسار الرئيسي أبداً.
 */
export async function afterPaymentReview(args: {
  paymentId:   string;
  orderId:     string;
  adminUserId: string;
  kind:        "verified" | "rejected" | "revision" | "refunded";
  note?:       string;
}) {
  try {
    const sb = svc();
    const { data: order } = await sb
      .from("orders")
      .select("customer_id, order_number")
      .eq("id", args.orderId)
      .single();

    if (order?.customer_id) {
      await notifyCustomerPayment(
        order.customer_id, order.order_number, args.orderId, args.kind, args.note,
      );
    }

    await sb.from("audit_log").insert({
      actor_id:  args.adminUserId,
      action:    "PAYMENT_ACTION",
      entity:    "payments",
      entity_id: args.paymentId,
      after:     { kind: args.kind, note: args.note ?? null, order_id: args.orderId },
    });
  } catch (err) {
    console.error("afterPaymentReview:", err);
  }
}
