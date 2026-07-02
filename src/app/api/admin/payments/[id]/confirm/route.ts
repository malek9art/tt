import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { PaymentGateway } from "@/lib/payment/gateway";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin("orders:manage");
  if (auth.error) return auth.error;

  const { id: paymentId } = await params;
  const body = await request.json().catch(() => ({})) as {
    transactionRef?: string; notes?: string; receiptUrl?: string;
  };

  // Save receipt URL before confirmation if provided
  if (body.receiptUrl) {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
    await sb.from("payments").update({ receipt_url: body.receiptUrl }).eq("id", paymentId);
  }

  const result = await PaymentGateway.confirmManual({
    paymentId,
    adminUserId:    auth.user.id,
    transactionRef: body.transactionRef,
    notes:          body.notes,
  });

  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
