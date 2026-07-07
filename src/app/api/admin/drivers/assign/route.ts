import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { notifyDriverAssigned } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  const { error, supabase, user } = await requireAdmin("delivery:manage");
  if (error) return error;

  const { shipment_id, driver_id } = await request.json();
  if (!shipment_id || !driver_id) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }

  const { data, error: dbErr } = await supabase.rpc("assign_shipment_to_driver", {
    _shipment_id: shipment_id,
    _driver_id:   driver_id,
    _admin_id:    user!.id,
  });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  const result = data as { error?: string; success?: boolean };
  if (result?.error) return NextResponse.json({ error: result.error }, { status: 400 });

  // إشعار المندوب داخل التطبيق — best-effort، لا يُفشل الإسناد إن تعذّر
  const { data: ship } = await supabase
    .from("shipments")
    .select("order_id, orders(order_number)")
    .eq("id", shipment_id)
    .maybeSingle();
  const rawOrder = ship?.orders as { order_number?: string } | { order_number?: string }[] | null;
  const orderNumber = Array.isArray(rawOrder) ? rawOrder[0]?.order_number : rawOrder?.order_number;
  if (orderNumber) {
    notifyDriverAssigned(driver_id, orderNumber, shipment_id).catch(() => {});
  }

  return NextResponse.json({ success: true, order_number: orderNumber ?? null });
}
