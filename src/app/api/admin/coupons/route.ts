import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const { error, supabase } = await requireAdmin("marketing:read");
  if (error) return error;

  const { data, error: dbErr } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ coupons: data ?? [] });
}

export async function POST(request: NextRequest) {
  const { error, supabase } = await requireAdmin("marketing:manage");
  if (error) return error;

  const body = await request.json();
  const { code, type, value, min_order_amount, max_uses, expires_at } = body;

  if (!code?.trim()) return NextResponse.json({ error: "كود الكوبون مطلوب" }, { status: 400 });
  if (!value || Number(value) <= 0) return NextResponse.json({ error: "قيمة الخصم مطلوبة" }, { status: 400 });

  const { data, error: dbErr } = await supabase
    .from("coupons")
    .insert({
      code:             code.trim().toUpperCase(),
      type:             type ?? "percentage",
      value:            Number(value),
      min_order_amount: min_order_amount ? Number(min_order_amount) : null,
      max_uses:         max_uses ? Number(max_uses) : null,
      expires_at:       expires_at || null,
      is_active:        true,
    })
    .select()
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
