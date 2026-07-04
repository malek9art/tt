import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getPureCustomerIds } from "@/lib/admin/customers";

export async function GET() {
  const { error, supabase } = await requireAdmin("products:read");
  if (error) return error;

  const [customerIds, ordersRes, productsRes, revenueRes, pendingRes, recentRes, lowStockRes] =
    await Promise.all([
      getPureCustomerIds(),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("orders").select("total_amount").eq("payment_status", "paid"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("orders")
        .select("id, order_number, status, payment_status, total_amount, currency, created_at")
        .order("created_at", { ascending: false }).limit(8),
      supabase.from("inventory")
        .select("quantity, reorder_level, product_variants(products(name_ar))")
        .lt("quantity", 5).limit(5),
    ]);

  const totalRevenue = (revenueRes.data ?? []).reduce((s, o) => s + o.total_amount, 0);

  return NextResponse.json({
    stats: {
      totalOrders:    ordersRes.count    ?? 0,
      totalProducts:  productsRes.count  ?? 0,
      totalCustomers: customerIds.size,
      totalRevenue,
      pendingOrders:  pendingRes.count   ?? 0,
    },
    recentOrders: recentRes.data ?? [],
    lowStock:     lowStockRes.data ?? [],
  });
}
