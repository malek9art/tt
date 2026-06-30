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
  const body = await request.json().catch(() => ({})) as { transactionRef?: string; notes?: string };

  const result = await PaymentGateway.confirmManual({
    paymentId,
    adminUserId:    auth.user.id,
    transactionRef: body.transactionRef,
    notes:          body.notes,
  });

  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
