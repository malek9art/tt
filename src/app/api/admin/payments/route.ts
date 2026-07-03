import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { PaymentGateway } from "@/lib/payment/gateway";
import { createClient } from "@supabase/supabase-js";

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin("orders:read");
  if (auth.error) return auth.error;

  const url    = new URL(request.url);
  const status = url.searchParams.get("status") ?? "";
  const limit  = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);
  const offset = Number(url.searchParams.get("offset") ?? 0);

  // كنس المهل المنتهية عند كل فتح للشاشة (بديل رخيص عن cron)
  await PaymentGateway.sweepExpired().catch(() => {});

  let query = sb()
    .from("payments")
    .select(`
      id, provider_code, method, amount, currency, status,
      transaction_ref, confirmed_at, created_at, instructions,
      reference_code, paid_amount, review_note, receipt_url, customer_note, expires_at,
      orders(id, order_number, customer_id, total_amount,
        profiles(full_name, phone))
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ payments: data ?? [], count: count ?? 0 });
}
