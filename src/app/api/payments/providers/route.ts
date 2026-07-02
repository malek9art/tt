import { NextResponse } from "next/server";
import { PaymentGateway } from "@/lib/payment/gateway";

export const revalidate = 60;

// Public endpoint: returns active payment providers for the checkout UI.
export async function GET() {
  try {
    const providers = await PaymentGateway.getActiveProviders();
    return NextResponse.json({ providers });
  } catch (err) {
    console.error("GET /api/payments/providers:", err);
    return NextResponse.json({ providers: [] });
  }
}
