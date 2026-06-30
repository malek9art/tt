import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, supabase } = await requireAdmin("customers:read");
  if (error) return error;
  const { id } = await params;

  const [profileRes, ordersRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase.from("orders")
      .select("id, order_number, status, payment_status, total_amount, currency, created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (profileRes.error) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const totalSpent = (ordersRes.data ?? [])
    .filter(o => o.payment_status === "paid")
    .reduce((s, o) => s + o.total_amount, 0);

  return NextResponse.json({
    ...profileRes.data,
    orders:      ordersRes.data ?? [],
    total_spent: totalSpent,
  });
}
