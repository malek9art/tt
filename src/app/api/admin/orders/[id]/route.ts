import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

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
  const { status } = await request.json();

  const { data, error: dbErr } = await supabase
    .from("orders").update({ status }).eq("id", id).select("id, status").single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data);
}
