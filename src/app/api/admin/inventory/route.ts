import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const { error, supabase } = await requireAdmin("products:read");
  if (error) return error;

  const { data, error: dbErr } = await supabase
    .from("inventory")
    .select(`
      id, quantity, reserved_quantity, reorder_level, reorder_quantity, location,
      product_variants(id, sku, attributes, products(id, name_ar, sku))
    `)
    .order("quantity", { ascending: true });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json({ inventory: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const { error, supabase } = await requireAdmin("products:manage");
  if (error) return error;

  const { id, quantity, reorder_level, reorder_quantity, location } = await request.json();
  if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (quantity          !== undefined) updates.quantity          = Number(quantity);
  if (reorder_level     !== undefined) updates.reorder_level     = Number(reorder_level);
  if (reorder_quantity  !== undefined) updates.reorder_quantity  = Number(reorder_quantity);
  if (location          !== undefined) updates.location          = location;

  const { data, error: dbErr } = await supabase
    .from("inventory")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
  return NextResponse.json(data);
}
