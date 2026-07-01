import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const { error, supabase } = await requireAdmin("products:read");
  if (error) return error;

  const { data, error: dbErr } = await supabase
    .from("inventory")
    .select(`
      id, quantity, reserved_quantity, reorder_level, reorder_quantity, location,
      product_variants(sku, attributes, products(name_ar, sku))
    `)
    .order("quantity", { ascending: true });

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  // Build CSV
  const headers = ["المنتج", "SKU", "الكمية", "محجوز", "متاح", "حد إعادة الطلب", "كمية إعادة الطلب", "الموقع", "الحالة"];

  const rows = (data ?? []).map((item: any) => {
    const pv   = Array.isArray(item.product_variants) ? item.product_variants[0] : item.product_variants;
    const prod = pv ? (Array.isArray(pv.products) ? pv.products[0] : pv.products) : null;
    const name = prod?.name_ar ?? "";
    const sku  = pv?.sku ?? prod?.sku ?? "";
    const avail = item.quantity - item.reserved_quantity;
    const status = item.quantity === 0 ? "نفد" : item.quantity <= item.reorder_level ? "منخفض" : "متوفر";

    return [
      `"${name}"`,
      sku,
      item.quantity,
      item.reserved_quantity,
      avail,
      item.reorder_level,
      item.reorder_quantity,
      item.location ?? "",
      status,
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const bom  = "﻿"; // UTF-8 BOM for Excel Arabic support

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventory-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
