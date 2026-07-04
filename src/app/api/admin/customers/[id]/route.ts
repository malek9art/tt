import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin("users:read");
  if (error) return error;
  const { id } = await params;

  const client = svc();
  const [profileRes, recentOrdersRes, paidOrdersRes, authRes] = await Promise.all([
    client.from("profiles").select("*").eq("id", id).single(),
    client.from("orders")
      .select("id, order_number, status, payment_status, total_amount, currency, created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    // إجمالي الإنفاق يُحسب من كل الطلبات المدفوعة، لا آخر 20 فقط —
    // القيمة السابقة كانت تُبتَر لأي عميل تجاوزت طلباته العشرين
    client.from("orders")
      .select("total_amount")
      .eq("customer_id", id)
      .eq("payment_status", "paid"),
    client.auth.admin.getUserById(id),
  ]);

  if (profileRes.error) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const totalSpent = (paidOrdersRes.data ?? [])
    .reduce((s, o) => s + Number(o.total_amount), 0);

  return NextResponse.json({
    ...profileRes.data,
    email:       authRes.data?.user?.email ?? "",
    orders:      recentOrdersRes.data ?? [],
    total_spent: totalSpent,
  });
}
