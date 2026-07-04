import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { PaymentGateway } from "@/lib/payment/gateway";
import { afterPaymentReview } from "@/lib/admin/payment-review";

// POST — طلب استكمال/تعديل من العميل (إثبات غير واضح، مرجع ناقص…)
// الدفعة تعود إلى pending والعميل يعيد رفع الإثبات من صفحة طلبه
// Body: { note: string }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin("finance:manage");
  if (auth.error) return auth.error;

  const { id: paymentId } = await params;
  const body = await request.json().catch(() => ({})) as { note?: string };

  const note = body.note?.trim();
  if (!note) return NextResponse.json({ error: "اكتب ما المطلوب من العميل — سيصله نصاً" }, { status: 400 });

  const result = await PaymentGateway.requestRevision({
    paymentId,
    adminUserId: auth.user.id,
    note,
  });
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

  await afterPaymentReview({
    paymentId, orderId: result.orderId,
    adminUserId: auth.user.id, kind: "revision", note,
  });

  return NextResponse.json({ success: true, status: "pending" });
}
