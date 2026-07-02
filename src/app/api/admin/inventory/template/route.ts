import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

// GET — قالب استيراد جاهز: كل المنتجات بأرصدتها الحالية، يعدّل المدير الكميات ثم يستورده
export async function GET() {
  const { error, supabase } = await requireAdmin("products:read");
  if (error) return error;

  const { data } = await supabase
    .from("inventory")
    .select(`
      quantity, reorder_level, reorder_quantity, location,
      product_variants(sku, products(name_ar, sku))
    `)
    .order("quantity", { ascending: true });

  const headers = ["المنتج (للمرجع فقط)", "SKU", "الكمية", "الموقع", "حد إعادة الطلب", "كمية إعادة الطلب"];

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const rows = (data ?? []).map((item: any) => {
    const pv   = Array.isArray(item.product_variants) ? item.product_variants[0] : item.product_variants;
    const prod = pv ? (Array.isArray(pv.products) ? pv.products[0] : pv.products) : null;
    return [
      `"${prod?.name_ar ?? ""}"`,
      pv?.sku ?? prod?.sku ?? "",
      item.quantity,
      item.location ?? "",
      item.reorder_level ?? 0,
      item.reorder_quantity ?? 0,
    ].join(",");
  });

  // Example row for clarity when inventory is empty
  if (rows.length === 0) {
    rows.push(`"مثال — هاتف سامسونج A15",SAM-A15-BLK,25,المخزن الرئيسي,5,20`);
  }

  const csv = [headers.join(","), ...rows].join("\n");
  const bom = "﻿"; // UTF-8 BOM so Excel opens Arabic correctly

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventory-template.csv"`,
    },
  });
}
