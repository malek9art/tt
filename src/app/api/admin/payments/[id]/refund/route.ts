import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";

function sb() {
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
  const auth = await requireAdmin("orders:manage");
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { notes?: string };

  const { data: payment, error: fetchErr } = await sb()
    .from("payments")
    .select("id, status, provider_code")
    .eq("id", id)
    .single();

  if (fetchErr) return NextResponse.json({ error: "لم يُعثر على عملية الدفع" }, { status: 404 });
  if (payment.status !== "paid") {
    return NextResponse.json({ error: "يمكن استرجاع المدفوعات المكتملة فقط" }, { status: 400 });
  }
  if (payment.provider_code === "stripe") {
    return NextResponse.json({ error: "الاسترجاع عبر Stripe يجب أن يتم من لوحة Stripe مباشرة" }, { status: 400 });
  }

  const { error } = await sb()
    .from("payments")
    .update({
      status:       "refunded",
      failure_reason: body.notes ?? "استرجاع يدوي من الإدارة",
      updated_at:   new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, status: "refunded" });
}
