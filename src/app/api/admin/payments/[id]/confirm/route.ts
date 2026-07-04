import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { PaymentGateway } from "@/lib/payment/gateway";
import { afterPaymentReview } from "@/lib/admin/payment-review";
import { createClient } from "@supabase/supabase-js";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin("finance:manage");
  if (auth.error) return auth.error;

  const { id: paymentId } = await params;
  const body = await request.json().catch(() => ({})) as {
    transactionRef?: string; notes?: string; receiptUrl?: string; paidAmount?: number;
  };

  const sb = svc();
  const { data: payment } = await sb
    .from("payments").select("id, order_id, amount").eq("id", paymentId).single();
  if (!payment) return NextResponse.json({ error: "لم يُعثر على عملية الدفع" }, { status: 404 });

  // قاعدة صارمة: لا تأكيد بمبلغ غير مطابق — استخدم «رفض» مع ذكر السبب
  if (body.paidAmount !== undefined && Number(body.paidAmount) !== Number(payment.amount)) {
    return NextResponse.json({
      error: `المبلغ المدفوع (${body.paidAmount}) لا يطابق المطلوب (${payment.amount}) — استخدم «رفض» مع توضيح السبب للعميل`,
    }, { status: 400 });
  }

  // حفظ إيصال أرفقه الأدمن قبل التأكيد
  if (body.receiptUrl) {
    await sb.from("payments").update({ receipt_url: body.receiptUrl }).eq("id", paymentId);
  }

  const result = await PaymentGateway.confirmManual({
    paymentId,
    adminUserId:    auth.user.id,
    transactionRef: body.transactionRef,
    notes:          body.notes,
    paidAmount:     body.paidAmount ?? Number(payment.amount),
  });

  if (result.success && result.status === "paid") {
    await afterPaymentReview({
      paymentId, orderId: payment.order_id,
      adminUserId: auth.user.id, kind: "verified",
    });
  }

  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
