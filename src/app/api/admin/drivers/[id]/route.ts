import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase } = await requireAdmin("delivery:manage");
  if (error) return error;

  const { id } = await params;
  const body   = await request.json();

  // تحديث بيانات المندوب في drivers
  const driverFields: Record<string, unknown> = {};
  if (body.vehicle_type  !== undefined) driverFields.vehicle_type  = body.vehicle_type;
  if (body.coverage_zone !== undefined) driverFields.coverage_zone = body.coverage_zone;
  if (body.max_orders    !== undefined) driverFields.max_orders    = body.max_orders;
  if (body.is_active     !== undefined) driverFields.is_active     = body.is_active;
  if (body.phone         !== undefined) driverFields.phone         = body.phone;
  if (body.notes         !== undefined) driverFields.notes         = body.notes;
  if (body.status        !== undefined) driverFields.status        = body.status;

  if (Object.keys(driverFields).length > 0) {
    const { error: dErr } = await supabase
      .from("drivers").update(driverFields).eq("id", id);
    if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });
  }

  // تحديث الاسم في profiles
  if (body.full_name !== undefined) {
    await supabase.from("profiles")
      .update({ full_name: body.full_name }).eq("id", id);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase } = await requireAdmin("delivery:manage");
  if (error) return error;
  const { id } = await params;

  // تعطيل فقط — لا حذف نهائي
  const { error: dbErr } = await supabase
    .from("drivers")
    .update({ is_active: false, status: "offline" })
    .eq("id", id);

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
