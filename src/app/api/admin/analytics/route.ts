import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const { error, supabase } = await requireAdmin("products:read");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days") ?? 7);

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  const [
    revenueRes, ordersRes, productsRes, customersRes,
    salesByDayRes, topProductsRes, ordersByStatusRes,
    recentOrdersRes,
  ] = await Promise.all([
    // إجمالي الإيرادات المدفوعة
    supabase.from("orders").select("total_amount")
      .eq("payment_status", "paid"),
    // الطلبات هذه الفترة
    supabase.from("orders").select("id", { count: "exact", head: true })
      .gte("created_at", sinceISO),
    // المنتجات المنشورة
    supabase.from("products").select("id", { count: "exact", head: true })
      .eq("status", "published"),
    // العملاء الجدد
    supabase.from("profiles").select("id", { count: "exact", head: true })
      .gte("created_at", sinceISO),
    // المبيعات اليومية
    supabase.from("orders")
      .select("created_at, total_amount, payment_status")
      .gte("created_at", sinceISO)
      .order("created_at", { ascending: true }),
    // أكثر المنتجات مبيعاً
    supabase.from("order_items")
      .select("name_snapshot, quantity, subtotal")
      .gte("created_at", sinceISO),
    // توزيع حالات الطلبات
    supabase.from("orders")
      .select("status")
      .gte("created_at", sinceISO),
    // آخر الطلبات
    supabase.from("orders")
      .select("id, order_number, status, total_amount, currency, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // إجمالي الإيرادات
  const totalRevenue = (revenueRes.data ?? [])
    .reduce((s, o) => s + o.total_amount, 0);

  // مبيعات يومية مجمّعة
  const dailySales: Record<string, { date: string; revenue: number; orders: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().split("T")[0];
    dailySales[key] = { date: key, revenue: 0, orders: 0 };
  }
  (salesByDayRes.data ?? []).forEach(o => {
    const key = o.created_at.split("T")[0];
    if (dailySales[key]) {
      dailySales[key].orders++;
      if (o.payment_status === "paid") dailySales[key].revenue += o.total_amount;
    }
  });

  // أكثر المنتجات مبيعاً
  const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  (topProductsRes.data ?? []).forEach(item => {
    const name = item.name_snapshot;
    if (!productMap[name]) productMap[name] = { name, qty: 0, revenue: 0 };
    productMap[name].qty     += item.quantity;
    productMap[name].revenue += item.subtotal;
  });
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // توزيع حالات الطلبات
  const statusCount: Record<string, number> = {};
  (ordersByStatusRes.data ?? []).forEach(o => {
    statusCount[o.status] = (statusCount[o.status] ?? 0) + 1;
  });

  return NextResponse.json({
    summary: {
      totalRevenue,
      totalOrders:    ordersRes.count    ?? 0,
      totalProducts:  productsRes.count  ?? 0,
      newCustomers:   customersRes.count ?? 0,
    },
    dailySales:    Object.values(dailySales),
    topProducts,
    ordersByStatus: statusCount,
    recentOrders:  recentOrdersRes.data ?? [],
    period: { days, since: sinceISO },
  });
}
