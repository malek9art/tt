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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin("finance:read");
  if (auth.error) return auth.error;

  const { id } = await params;

  const { data: entries, error } = await sb()
    .from("driver_cash_ledger")
    .select("id, entry_type, amount, order_id, shipment_id, note, created_at, orders(order_number)")
    .eq("driver_id", id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const balance = (entries ?? []).reduce((s, e) => s + Number(e.amount), 0);
  return NextResponse.json({ entries: entries ?? [], balance });
}

// POST — تسوية الرصيد الكامل (تسليم العهدة للصندوق) عبر RPC settle_driver_cash
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, supabase, user } = await requireAdmin("finance:manage");
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { note?: string };

  const { data, error: dbErr } = await supabase.rpc("settle_driver_cash", {
    _driver_id: id,
    _admin_id:  user!.id,
    _note:      body.note || null,
  });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  const result = data as { error?: string; success?: boolean; settled_amount?: number };
  if (result?.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
