import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// POST /api/payments/[id]/receipt
// Customer attaches proof of transfer (receipt image URL and/or SMS text).
// Payment stays awaiting_confirmation until admin verifies.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cs: { name: string; value: string; options: CookieOptions }[]) {
            try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
            catch { /* */ }
          },
        },
      },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

    const { id: paymentId } = await params;
    const body = await request.json() as { receiptUrl?: string; note?: string };

    if (!body.receiptUrl && !body.note?.trim()) {
      return NextResponse.json({ error: "أرفق صورة الإيصال أو نص الإشعار" }, { status: 400 });
    }

    const sb = serviceClient();

    // Verify the payment's order belongs to this user
    const { data: payment } = await sb
      .from("payments")
      .select("id, status, provider_code, orders!inner(customer_id)")
      .eq("id", paymentId)
      .single();

    const owner = (payment?.orders as unknown as { customer_id: string } | null)?.customer_id;
    if (!payment || owner !== user.id) {
      return NextResponse.json({ error: "عملية الدفع غير موجودة" }, { status: 404 });
    }
    if (!["pending", "awaiting_confirmation"].includes(payment.status)) {
      return NextResponse.json({ error: "لا يمكن إرفاق إيصال لهذه العملية" }, { status: 400 });
    }

    const { error } = await sb
      .from("payments")
      .update({
        receipt_url:   body.receiptUrl ?? null,
        customer_note: body.note?.trim() || null,
        status:        "awaiting_confirmation",
        updated_at:    new Date().toISOString(),
      })
      .eq("id", paymentId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await sb.from("payment_logs").insert({
      payment_id:    paymentId,
      event_type:    "customer_receipt",
      direction:     "inbound",
      provider_code: payment.provider_code,
      request_data:  { has_receipt: !!body.receiptUrl, has_note: !!body.note },
      response_data: {},
    });

    return NextResponse.json({ success: true, status: "awaiting_confirmation" });
  } catch (err) {
    console.error("POST /api/payments/[id]/receipt:", err);
    return NextResponse.json({ error: "خطأ غير متوقع" }, { status: 500 });
  }
}
