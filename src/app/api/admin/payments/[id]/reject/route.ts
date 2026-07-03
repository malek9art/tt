import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { PaymentGateway } from "@/lib/payment/gateway";
import { afterPaymentReview } from "@/lib/admin/payment-review";

// POST — رفض دفعة (مبلغ غير مطابق، إثبات غير صحيح…)
// Body: { reason: string; paidAmount?: number }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin("orders:manage");
  if (auth.error) return auth.error;

  const { id: paymentId } = await params;
  const body = await request.json().catch(() => ({})) as { reason?: string; paidAmount?: number };

  const reason = body.reason?.trim();
  if (!reason) return NextResponse.json({ error: "اذكر سبب الرفض — سيصل للعميل" }, { status: 400 });

  const result = await PaymentGateway.reject({
    paymentId,
    adminUserId: auth.user.id,
    reason,
    paidAmount: body.paidAmount,
  });
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

  await afterPaymentReview({
    paymentId, orderId: result.orderId,
    adminUserId: auth.user.id, kind: "rejected", note: reason,
  });

  return NextResponse.json({ success: true, status: "failed" });
}
