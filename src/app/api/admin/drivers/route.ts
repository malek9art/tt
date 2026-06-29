import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const { error, supabase } = await requireAdmin("delivery:manage");
  if (error) return error;

  const { data, error: dbErr } = await supabase.rpc("get_drivers_stats");
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const { error, supabase } = await requireAdmin("delivery:manage");
  if (error) return error;

  const body = await request.json();
  const { email, full_name, phone, password, vehicle_type, coverage_zone, max_orders } = body;

  if (!email || !full_name || !phone || !password) {
    return NextResponse.json({ error: "البيانات الأساسية مطلوبة" }, { status: 400 });
  }

  const { data, error: dbErr } = await supabase.rpc("create_driver_account", {
    _email:      email.trim().toLowerCase(),
    _full_name:  full_name.trim(),
    _phone:      phone.trim(),
    _password:   password,
    _vehicle:    vehicle_type  || "motorcycle",
    _zone:       coverage_zone || "تعز",
    _max_orders: max_orders    || 5,
  });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  const result = data as { error?: string; success?: boolean; user_id?: string };
  if (result?.error) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ success: true, user_id: result?.user_id });
}
