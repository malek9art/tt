import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const { error, supabase } = await requireAdmin("orders:read");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page   = Number(searchParams.get("page")   ?? 1);
  const limit  = Number(searchParams.get("limit")  ?? 20);
  const status = searchParams.get("status");
  const from   = (page - 1) * limit;

  let query = supabase
    .from("orders")
    .select(`
      id, order_number, status, payment_status,
      total_amount, currency, created_at,
      profiles(full_name, phone),
      order_items(name_snapshot, quantity)
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, count, error: dbErr } = await query;
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ orders: data ?? [], total: count ?? 0 });
}
