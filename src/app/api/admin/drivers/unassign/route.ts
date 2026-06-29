import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const { error, supabase, user } = await requireAdmin("delivery:manage");
  if (error) return error;

  const { shipment_id } = await request.json();

  const { data, error: dbErr } = await supabase.rpc("unassign_shipment", {
    _shipment_id: shipment_id,
    _admin_id: user!.id,
  });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  const result = data as { error?: string; success?: boolean };
  if (result?.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}
