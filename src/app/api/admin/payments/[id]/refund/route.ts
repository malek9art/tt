import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { PaymentGateway } from "@/lib/payment/gateway";
import { afterPaymentReview } from "@/lib/admin/payment-review";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin("finance:manage");
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { notes?: string };

  // Stripe يُسترجع من لوحة Stripe نفسها (عكس العملية المالية خارج نطاقنا)
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: payment } = await sb
    .from("payments").select("provider_code").eq("id", id).single();
  if (payment?.provider_code === "stripe") {
    return NextResponse.json({ error: "الاسترجاع عبر Stripe يجب أن يتم من لوحة Stripe مباشرة" }, { status: 400 });
  }

  const result = await PaymentGateway.markRefunded({
    paymentId: id,
    adminUserId: auth.user.id,
    reason: body.notes,
  });
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

  await afterPaymentReview({
    paymentId: id, orderId: result.orderId,
    adminUserId: auth.user.id, kind: "refunded", note: body.notes,
  });

  return NextResponse.json({ success: true, status: "refunded" });
}
