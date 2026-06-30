import { NextRequest, NextResponse } from "next/server";
import { PaymentGateway } from "@/lib/payment/gateway";

// Receives webhooks from payment providers (e.g. Stripe).
// URL: /api/payments/webhook/stripe
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const rawBody  = await request.text();
  const headers  = Object.fromEntries(request.headers.entries());
  const signature = headers["stripe-signature"] ?? headers["x-signature"] ?? undefined;

  const result = await PaymentGateway.handleWebhook(provider, {
    providerCode: provider,
    rawBody,
    headers,
    signature,
  });

  if (!result.verified) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ received: true });
}
