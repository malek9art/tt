import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { notifyOrderPaid, notifyOrderCancelled } from "@/lib/notifications";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, supabase } = await requireAdmin("orders:read");
  if (error) return error;
  const { id } = await params;

  const { data, error: dbErr } = await supabase
    .from("orders")
    .select(`*, profiles(full_name, phone), order_items(*), shipments(*), payments(*)`)
    .eq("id", id).single();

  if (dbErr) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, supabase } = await requireAdmin("orders:manage");
  if (error) return error;
  const { id } = await params;
  const body = await request.json() as { status?: string; payment_status?: string };

  const updateData: Record<string, string> = {};
  if (body.status)         updateData.status = body.status;
  if (body.payment_status) updateData.payment_status = body.payment_status;

  const { data, error: dbErr } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", id)
    .select("id, order_number, status, payment_status")
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  // إشعارات تلقائية عند تغيير الحالة
  if (body.payment_status === "paid" && data?.order_number) {
    notifyOrderPaid(data.order_number, id).catch(() => {});
  }
  if (body.status === "cancelled" && data?.order_number) {
    notifyOrderCancelled(data.order_number, id).catch(() => {});
  }

  return NextResponse.json(data);
}
