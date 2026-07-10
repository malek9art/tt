import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { notifyOrderPaid, notifyOrderCancelled, notifyCustomerOrderStatus } from "@/lib/notifications";
import { applyOrderStock } from "@/lib/admin/stock";

const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  confirmed:          "تم تأكيد طلبك وجاري تجهيزه",
  processing:         "جاري تجهيز طلبك",
  ready_for_delivery: "طلبك جاهز للشحن",
  out_for_delivery:   "طلبك في الطريق إليك 🚚",
  delivered:          "تم تسليم طلبك بنجاح ✅",
  returned:           "تم إرجاع طلبك",
};

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, supabase } = await requireAdmin("orders:read");
  if (error) return error;
  const { id } = await params;

  const { data, error: dbErr } = await supabase
    .from("orders")
    .select(`*, profiles(full_name, phone), order_items(*), shipments(*), payments(*)`)
    .eq("id", id).single();

  if (dbErr) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, supabase } = await requireAdmin("orders:manage");
  if (error) return error;
  const { id } = await params;
  const body = await request.json() as { status?: string; payment_status?: string };

  // الحالة السابقة — لنعرف إن كان هذا إلغاءً جديداً فلا نُرجع المخزون مرتين
  const { data: prev } = await supabase
    .from("orders")
    .select("status, customer_id, order_items(variant_id, name_snapshot, quantity), payments(provider_code, status, receipt_url, customer_note)")
    .eq("id", id)
    .single();

  // لا يكتمل الطلب (أي حالة غير pending/cancelled) قبل إرفاق إثبات الدفع
  // لطرق الدفع اليدوية — نفس القاعدة المُطبَّقة في PaymentGateway.confirmManual،
  // مطلوبة هنا أيضاً لأن هذه القائمة المنسدلة تُغيّر orders.status مباشرة
  // بمعزل تام عن مسار تأكيد الدفعة
  if (body.status && !["pending", "cancelled"].includes(body.status)) {
    const rawPayment = prev?.payments as { provider_code: string; status: string; receipt_url: string | null; customer_note: string | null } | { provider_code: string; status: string; receipt_url: string | null; customer_note: string | null }[] | null;
    const payment = Array.isArray(rawPayment) ? rawPayment[0] : rawPayment;
    if (payment && payment.provider_code !== "cod" && payment.status !== "paid"
      && !payment.receipt_url && !payment.customer_note) {
      return NextResponse.json({
        error: "لا يمكن تغيير حالة الطلب قبل إرفاق إثبات الدفع (صورة الإيصال أو ملاحظة) وتأكيده",
      }, { status: 400 });
    }
  }

  const updateData: Record<string, string> = {};
  if (body.status)         updateData.status = body.status;
  if (body.payment_status) updateData.payment_status = body.payment_status;

  const { data, error: dbErr } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", id)
    .select("id, order_number, status, payment_status")
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  // إشعارات تلقائية عند تغيير الحالة
  if (body.payment_status === "paid" && data?.order_number) {
    notifyOrderPaid(data.order_number, id).catch(() => {});
  }
  if (body.status === "cancelled" && data?.order_number) {
    notifyOrderCancelled(data.order_number, id).catch(() => {});
    // إرجاع الكميات للمخزون مع قيد حركة — مرة واحدة فقط عند أول إلغاء
    if (prev && prev.status !== "cancelled") {
      const items = ((prev.order_items ?? []) as { variant_id: string | null; name_snapshot: string; quantity: number }[])
        .map(i => ({ variant_id: i.variant_id, name_snapshot: i.name_snapshot, quantity: i.quantity }));
      applyOrderStock(id, data.order_number, items, "return");
    }
  } else if (body.status && body.status !== prev?.status && prev?.customer_id && data?.order_number) {
    const label = CUSTOMER_STATUS_LABELS[body.status];
    if (label) notifyCustomerOrderStatus(prev.customer_id, data.order_number, label).catch(() => {});
  }

  return NextResponse.json(data);
}
